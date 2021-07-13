import IVS from 'aws-sdk/clients/ivs';
import MongoClient from '../../libs/mongoClient';

const {
  COLL_LIVE_STREAM,
  DB_NAME,
  IVS_REGION,
} = process.env;

const ivs = new IVS({
  apiVersion: '2020-07-14',
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

    if (!dbLiveStream.expired) {
      // Prevent future reconnections
      try {
        await ivs.deleteStreamKey({
          arn: dbLiveStream.aws.streamKeyArn,
        }).promise();
      } catch (e) {
        /* Even if that fails, we shall be able to delete the stream, it will delete the key too */
      }

      try {
        // Stop current streams if any, to allow deletion
        await ivs.stopStream({
          arn: dbLiveStream.aws.arn,
        }).promise();
      } catch (e) {
        /* Do nothing, it was probably stopped... */
      }

      // Delete streaming channel
      await ivs.deleteChannel({
        arn: dbLiveStream.aws.arn,
      }).promise();
    }

    await client
      .db(DB_NAME)
      .collection(COLL_LIVE_STREAM)
      .deleteOne({ _id: liveStreamId });

    return (true);
  } finally {
    client.close();
  }
};
