import S3 from 'aws-sdk/clients/s3';
import MongoClient from '../../libs/mongoClient';
import { filterOutput } from './utils';

const {
  COLL_LIVE_STREAM,
  DB_NAME,
  IVS_BUCKET,
  IVS_REGION,
} = process.env;

const s3 = new S3({
  apiVersion: '2006-03-01',
  region: IVS_REGION,
});

export default async (appId, liveStreamId) => {
  const client = await MongoClient.connect();
  try {
    const dbLiveStream = await client
      .db(DB_NAME)
      .collection(COLL_LIVE_STREAM)
      .findOne({
        _id: liveStreamId,
        appId,
        provider: 'aws-ivs',
      });
    if (!dbLiveStream) {
      throw new Error('live_stream_not_found');
    }

    let continuationToken;
    const s3Prefix = `ivs/v1/630176884077/${dbLiveStream.aws.arn.split('/').pop()}/`;
    const keyMatch = /\/events\/recording-(started|ended|failed)\.json$/;
    const keyStateMatch = /^.*\/events\/recording-(started|ended|failed)\.json$/;
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

      if (videosObjects.isTruncated) continuationToken = videosObjects.NextContinuationToken;
      else continuationToken = null;
    } while (continuationToken);

    if (Object.keys(recordingsByState).length > 0) {
      const dbRecordings = [];

      await Promise.allSettled(Object.keys(recordingsByState).map(async (s3Root) => {
        let state;
        if (recordingsByState[s3Root].ended) state = 'ended';
        else if (recordingsByState[s3Root].failed) state = 'failed';
        else state = 'started';

        const s3data = await s3.getObject({
          Bucket: IVS_BUCKET,
          Key: recordingsByState[s3Root][state],
        }).promise();
        const jsonText = s3data.Body.toString('utf8');
        const json = JSON.parse(jsonText);

        const newDbRecording = {
          state,
          start: new Date(json.recording_started_at),
          duration: json.media.hls.duration_ms,
          baseUrl: `https://${IVS_BUCKET}.s3.amazonaws.com`,
          root: s3Root,
        };
        if (json.recording_ended_at) newDbRecording.end = new Date(json.recording_ended_at);
        if (json.duration_ms) newDbRecording.duration = json.duration_ms;
        if (json.media && json.media.hls && json.media.hls.path) {
          newDbRecording.playlist = `${json.media.hls.path}/${json.media.hls.playlist}`;
        }

        dbRecordings.push(newDbRecording);
      }));

      if (dbRecordings.length > 0) {
        dbRecordings.sort((a, b) => (a.start.getTime() - b.start.getTime()));

        await client
          .db(DB_NAME)
          .collection(COLL_LIVE_STREAM)
          .updateOne({ _id: liveStreamId }, {
            $set: {
              recordings: dbRecordings,
            },
          });
      }
    }

    return (filterOutput(dbLiveStream));
  } finally {
    client.close();
  }
};
