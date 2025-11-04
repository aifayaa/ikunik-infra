/* eslint-disable import/no-relative-packages */
import {
  MediaConvertClient,
  CreateJobCommand,
} from '@aws-sdk/client-mediaconvert';
import path from 'path';
import MongoClient from '../../libs/mongoClient';
import getCollectionFromContentType from './getCollectionFromContentType';
import uploadStatus from '../uploadStatus.json';

const {
  MEDIACONVERT_REGION,
  MEDIACONVERT_ROLE_ARN,
  STAGE,
  REGION,
  S3_PICTURES_BUCKET,
} = process.env;

const mediaconvert = new MediaConvertClient({
  apiVersion: '2017-08-29',
  region: MEDIACONVERT_REGION,
});

export default async (bucket, object, file) => {
  const client = await MongoClient.connect();

  /* all key names are lowercaser in metadata */
  const { id, title, type } = file.Metadata;

  if (!id) {
    throw new Error('missing_id');
  }

  try {
    /* Get existing document and check it exists */
    const collection = getCollectionFromContentType(type);
    const document = await client.db().collection(collection).findOne({
      _id: id,
    });

    if (!document) {
      throw new Error('document_not_found');
    }

    /* Check content type match */
    if (type !== file.ContentType) {
      await client
        .db()
        .collection(collection)
        .updateOne(
          { _id: document._id },
          { $set: { status: uploadStatus.UPLOAD_ERROR } }
        );
      throw new Error('content_type_mismatch');
    }

    /* Update video document with more info and status */
    const videoDoc = Object.assign(document, {
      _id: id,
      title: title || '',
      status: uploadStatus.ENCODING,
    });

    await client
      .db()
      .collection(collection)
      .updateOne({ _id: document._id }, { $set: videoDoc });

    /* Proceed to encoding */
    const videoPath = `${decodeURI(object.key).replace(/\+/gi, ' ')}`;
    const { name } = path.parse(videoPath);

    try {
      const audioBitrate1 = 128000;
      const audioBitrate2 = 96000;
      const presets = [
        {
          name: 'hls-5M',
          videoBitrate: 5000000 - audioBitrate1,
          audioBitrate: audioBitrate1,
          width: 1920,
          height: 1080,
        },
        {
          name: 'hls-2M',
          videoBitrate: 2000000 - audioBitrate1,
          audioBitrate: audioBitrate1,
          width: 1024,
          height: 768,
        },
        {
          name: 'hls-1.5M',
          videoBitrate: 1500000 - audioBitrate1,
          audioBitrate: audioBitrate1,
          width: 960,
          height: 640,
        },
        {
          name: 'hls-1M',
          videoBitrate: 1000000 - audioBitrate2,
          audioBitrate: audioBitrate2,
          width: 640,
          height: 432,
        },
        {
          name: 'hls-600k',
          videoBitrate: 600000 - audioBitrate2,
          audioBitrate: audioBitrate2,
          width: 480,
          height: 320,
        },
        {
          name: 'hls-400k',
          videoBitrate: 400000 - audioBitrate2,
          audioBitrate: audioBitrate2,
          width: 400,
          height: 288,
        },
      ];
      const hlsOutputs = presets.map((preset) => ({
        NameModifier: `/${preset.name}/main`,
        ContainerSettings: {
          Container: 'M3U8',
          M3u8Settings: {
            AudioFramesPerPes: 4,
            PcrControl: 'PCR_EVERY_PES_PACKET',
            PmtPid: 480,
            VideoPid: 481,
            AudioPids: [482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492],
          },
        },
        VideoDescription: {
          CodecSettings: {
            Codec: 'H_264',
            Width: preset.width,
            Height: preset.height,
            ScalingBehavior: 'FIT_NO_UPSCALE',
            H264Settings: {
              RateControlMode: 'QVBR',
              QualityTuningLevel: 'SINGLE_PASS_HQ',
              MaxBitrate: preset.videoBitrate,
              FramerateControl: 'INITIALIZE_FROM_SOURCE',
              GopSize: 60,
              GopSizeUnits: 'FRAMES',
              NumberBFramesBetweenReferenceFrames: 3,
              ParControl: 'INITIALIZE_FROM_SOURCE',
              SceneChangeDetect: 'ENABLED',
            },
          },
        },
        AudioDescriptions: [
          {
            CodecSettings: {
              Codec: 'AAC',
              AacSettings: {
                Bitrate: preset.audioBitrate,
                CodingMode: 'CODING_MODE_2_0',
                SampleRate: 48000,
              },
            },
          },
        ],
      }));
      const input = {
        ClientRequestToken: document._id,
        Role: MEDIACONVERT_ROLE_ARN,
        Settings: {
          Inputs: [
            {
              FileInput: `s3://${bucket.name}/${videoPath}`,
              AudioSelectors: {
                'Audio Selector 1': {
                  DefaultSelection: 'DEFAULT',
                },
              },
              VideoSelector: {},
              TimecodeSource: 'ZEROBASED',
            },
          ],
          OutputGroups: [
            // HLS Output Group with multiple bitrates
            {
              Name: 'HLS Group',
              OutputGroupSettings: {
                Type: 'HLS_GROUP_SETTINGS',
                HlsGroupSettings: {
                  SegmentLength: 6,
                  MinSegmentLength: 0,
                  Destination: `s3://${S3_PICTURES_BUCKET}/videos/${name}/`,
                  ManifestDurationFormat: 'INTEGER',
                  SegmentControl: 'SEGMENTED_FILES',
                  ClientCache: 'ENABLED',
                  CodecSpecification: 'RFC_4281',
                  OutputSelection: 'MANIFESTS_AND_SEGMENTS',
                  TimedMetadataId3Period: 10,
                  TimedMetadataId3Frame: 'PRIV',
                  ProgramDateTimePeriod: 600,
                  DestinationSettings: {
                    S3Settings: {
                      AccessControl: {
                        CannedAcl: 'PUBLIC_READ',
                      },
                    },
                  },
                },
              },
              Outputs: hlsOutputs,
            },
            // Thumbnail Output Group
            {
              Name: 'Thumbnail Group',
              OutputGroupSettings: {
                Type: 'FILE_GROUP_SETTINGS',
                FileGroupSettings: {
                  Destination: `s3://${S3_PICTURES_BUCKET}/videos/${name}/`,
                  DestinationSettings: {
                    S3Settings: {
                      AccessControl: {
                        CannedAcl: 'PUBLIC_READ',
                      },
                    },
                  },
                },
              },
              Outputs: [
                {
                  NameModifier: '/thumbnails/thumbnail',
                  ContainerSettings: {
                    Container: 'RAW',
                  },
                  VideoDescription: {
                    width: presets[0].width,
                    height: presets[0].height,
                    ScalingBehavior: 'FIT_NO_UPSCALE',
                    CodecSettings: {
                      Codec: 'FRAME_CAPTURE',
                      FrameCaptureSettings: {
                        FramerateNumerator: 1,
                        FramerateDenominator: 10,
                        MaxCaptures: 6, // Captures up to 6 pictures at 10 seconds intervals. We will use the last one.
                        Quality: 80,
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
        Tags: {
          automated: 'true',
          from: 'api',
          module: 'files/manageVideo',
          id: document._id,
          stage: STAGE,
          region: REGION,
        },
        UserMetadata: {
          id: document._id,
          name,
        },
      };

      const command = new CreateJobCommand(input);
      /* const response = */ await mediaconvert.send(command);
      // const jobArn = response && response.Job && response.Job.Arn;

      // await client
      //   .db()
      //   .collection(collection)
      //   .updateOne(
      //     { _id: document._id },
      //     {
      //       $set: {
      //         awsMediaconvertJobArn: jobArn,
      //       },
      //     }
      //   );
    } catch (e) {
      await client
        .db()
        .collection(collection)
        .updateOne(
          { _id: document._id },
          {
            $set: {
              message: e.message,
              status: uploadStatus.ENCODING_JOB_ERROR,
            },
          }
        );
    }
  } finally {
    await client.close();
  }
  return null;
};
