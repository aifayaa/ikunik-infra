/* eslint-disable import/no-relative-packages */
import S3 from 'aws-sdk/clients/s3';
import MediaConvert from 'aws-sdk/clients/mediaconvert';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { filterOutput } from './utils';
import {
  LIVESTREAM_PROVIDER_AWS_IVS,
  LIVESTREAM_PROVIDER_AWS_IVS_APP,
} from './constants';

const { IVS_BUCKET, IVS_REGION } = process.env;

const { COLL_LIVE_STREAMS } = mongoCollections;

const s3 = new S3({
  apiVersion: '2006-03-01',
  region: IVS_REGION,
});

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

export default async (appId, liveStreamId) => {
  const client = await MongoClient.connect();
  try {
    const dbLiveStream = await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .findOne({
        _id: liveStreamId,
        appId,
        provider: {
          $in: [LIVESTREAM_PROVIDER_AWS_IVS, LIVESTREAM_PROVIDER_AWS_IVS_APP],
        },
      });
    if (!dbLiveStream) {
      throw new Error('live_stream_not_found');
    }

    let csmediaconvert = null;

    let continuationToken;
    const s3Prefix = `ivs/v1/630176884077/${dbLiveStream.aws.arn.split('/').pop()}/`;
    const keyMatch = /\/events\/recording-(started|ended|failed)\.json$/;
    const keyStateMatch =
      /^.*\/events\/recording-(started|ended|failed)\.json$/;
    const recordingsByState = {};

    do {
      const query = {
        Bucket: IVS_BUCKET,
        Prefix: s3Prefix,
      };
      if (continuationToken) query.ContinuationToken = continuationToken;
      // eslint-disable-next-line no-await-in-loop
      const videosObjects = await s3.listObjectsV2(query).promise();

      if (videosObjects.Contents) {
        videosObjects.Contents.forEach(({ Key }) => {
          if (Key.match(keyMatch)) {
            const root = Key.replace(keyMatch, '');
            const state = Key.replace(keyStateMatch, '$1');
            if (!recordingsByState[root]) recordingsByState[root] = {};
            recordingsByState[root][state] = Key;
          }
        });
      }

      if (videosObjects.IsTruncated)
        continuationToken = videosObjects.NextContinuationToken;
      else continuationToken = null;
    } while (continuationToken);

    if (Object.keys(recordingsByState).length > 0) {
      const dbRecordings = [];

      const getRecordingWithRoot = (root) => {
        if (!dbLiveStream.recordings) return {};

        for (let i = 0; i < dbLiveStream.recordings.length; i += 1) {
          const current = dbLiveStream.recordings[i];
          if (current.root === root) {
            return JSON.parse(JSON.stringify(current));
          }
        }

        return {};
      };

      await Promise.allSettled(
        Object.keys(recordingsByState).map(async (s3Root) => {
          let state;
          if (recordingsByState[s3Root].ended) state = 'ended';
          else if (recordingsByState[s3Root].failed) state = 'failed';
          else state = 'started';

          const s3data = await s3
            .getObject({
              Bucket: IVS_BUCKET,
              Key: recordingsByState[s3Root][state],
            })
            .promise();
          const jsonText = s3data.Body.toString('utf8');
          const json = JSON.parse(jsonText);

          const currentRecording = getRecordingWithRoot(s3Root);
          currentRecording.state = state;
          currentRecording.start = new Date(json.recording_started_at);
          currentRecording.duration = json.media.hls.duration_ms;
          currentRecording.baseUrl = `https://${IVS_BUCKET}.s3.amazonaws.com`;
          currentRecording.root = s3Root;

          if (json.recording_ended_at)
            currentRecording.end = new Date(json.recording_ended_at);
          if (json.duration_ms) currentRecording.duration = json.duration_ms;
          if (json.media && json.media.hls && json.media.hls.path) {
            currentRecording.playlist = `${json.media.hls.path}/${json.media.hls.playlist}`;
          }

          if (currentRecording.conversion) {
            if (
              currentRecording.conversion.status !== 'COMPLETE' &&
              currentRecording.conversion.status !== 'CANCELED' &&
              currentRecording.conversion.status !== 'ERROR'
            ) {
              if (!csmediaconvert) {
                csmediaconvert = await loadCSMediaConvertEndpoint();
              }

              const convertJob = await csmediaconvert
                .getJob({
                  Id: currentRecording.conversion.mediaConvertId,
                })
                .promise();

              currentRecording.conversion.status =
                convertJob.Job.Status || 'PROCESSING';
              currentRecording.conversion.completion =
                convertJob.Job.JobPercentComplete || 0;
            }
          }

          dbRecordings.push(currentRecording);
        })
      );

      if (dbRecordings.length > 0) {
        dbRecordings.sort((a, b) => a.start.getTime() - b.start.getTime());

        await client
          .db()
          .collection(COLL_LIVE_STREAMS)
          .updateOne(
            { _id: liveStreamId },
            {
              $set: {
                recordings: dbRecordings,
              },
            }
          );
      }
    }

    return filterOutput(dbLiveStream);
  } finally {
    client.close();
  }
};
