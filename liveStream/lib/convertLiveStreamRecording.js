/* eslint-disable import/no-relative-packages */
import MediaConvert from 'aws-sdk/clients/mediaconvert';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { LIVESTREAM_PROVIDER_AWS_IVS } from './constants';

const { IVS_BUCKET, IVS_REGION, MEDIACONVERT_IAM_ROLE_ARN } = process.env;

const { COLL_LIVE_STREAMS } = mongoCollections;

const mediaconvert = new MediaConvert({
  apiVersion: '2017-08-29',
  region: IVS_REGION,
});

let endpointUrl = null;

/** Customer-specific endpoint is required, so we need to fetch it first */
async function loadCSMediaConvertEndpoint() {
  if (endpointUrl === null) {
    const { Endpoints } = await mediaconvert.describeEndpoints({}).promise();
    endpointUrl = Endpoints[0].Url;
  }

  const csmediaconvert = new MediaConvert({
    apiVersion: '2017-08-29',
    region: IVS_REGION,
    endpoint: endpointUrl,
  });

  return csmediaconvert;
}

export default async (appId, liveStreamId, recordingRoot) => {
  const client = await MongoClient.connect();
  try {
    const dbQuery = {
      _id: liveStreamId,
      appId,
      provider: LIVESTREAM_PROVIDER_AWS_IVS,
      'recordings.root': recordingRoot,
    };
    const dbLiveStream = await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .findOne(dbQuery, {
        projection: { _id: 1, 'recordings.$': 1, conversions: 1 },
      });
    if (!dbLiveStream) {
      throw new Error('live_stream_record_not_found');
    }

    const dbRecord = dbLiveStream.recordings[0];
    if (dbRecord.conversion) {
      if (
        dbRecord.conversion.status !== 'CANCELED' &&
        dbRecord.conversion.status !== 'ERROR'
      ) {
        return false;
      }
    }

    const csmediaconvert = await loadCSMediaConvertEndpoint();

    /**
     * The documentation about this API is HUMONGOUS!!!!
     * We could fine-tune it forever... See for yourself :
     * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/MediaConvert.html#createJob-property
     */
    const convertJob = await csmediaconvert
      .createJob({
        Role: MEDIACONVERT_IAM_ROLE_ARN,
        Settings: {
          TimecodeConfig: {
            Source: 'ZEROBASED',
          },
          OutputGroups: [
            {
              CustomName: 'Output 1',
              Name: 'File Group',
              Outputs: [
                {
                  ContainerSettings: {
                    Container: 'MP4',
                    Mp4Settings: {},
                  },
                  VideoDescription: {
                    CodecSettings: {
                      Codec: 'H_264',
                      H264Settings: {
                        RateControlMode: 'QVBR',
                        QvbrSettings: {
                          QvbrQualityLevel: 7,
                        },
                        /** Should be high enough to have a really sharp image,
                         * youtube goes up to 9Mbps for 1080p60 videos AFAIK */
                        MaxBitrate: 10000000,
                      },
                    },
                  },
                  AudioDescriptions: [
                    {
                      CodecSettings: {
                        Codec: 'AAC',
                        AacSettings: {
                          CodingMode: 'CODING_MODE_2_0',
                          SampleRate: 48000,
                          RateControlMode: 'VBR',
                          VbrQuality: 'MEDIUM_HIGH',
                        },
                      },
                      AudioSourceName: 'Audio Selector 1',
                    },
                  ],
                },
              ],
              OutputGroupSettings: {
                Type: 'FILE_GROUP_SETTINGS',
                FileGroupSettings: {
                  Destination: `s3://${IVS_BUCKET}/${recordingRoot}/`,
                },
              },
            },
          ],
          Inputs: [
            {
              AudioSelectors: {
                'Audio Selector 1': {
                  DefaultSelection: 'DEFAULT',
                },
              },
              VideoSelector: {},
              TimecodeSource: 'ZEROBASED',
              FileInput: `s3://${IVS_BUCKET}/${recordingRoot}/${dbRecord.playlist}`,
            },
          ],
        },
        BillingTagsSource: 'JOB',
        AccelerationSettings: {
          Mode: 'DISABLED',
        },
        StatusUpdateInterval: 'SECONDS_120',
        Priority: 0,
      })
      .promise();

    dbRecord.conversion = {
      mediaConvertArn: convertJob.Job.Arn,
      mediaConvertId: convertJob.Job.Id,
      fileKey: `${recordingRoot}/${dbRecord.playlist.replace(/(^.*\/|\.[^.]*$)/g, '')}.mp4`,
      status: convertJob.Job.Status || 'PROCESSING',
      completion: convertJob.Job.JobPercentComplete || 0,
    };

    await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .updateOne(dbQuery, {
        $set: {
          'recordings.$': dbRecord,
        },
      });

    return true;
  } finally {
    client.close();
  }
};
