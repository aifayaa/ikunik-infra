/* eslint-disable import/no-relative-packages */
import IVS from 'aws-sdk/clients/ivs';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { IVS_REGION } = process.env;

const { COLL_LIVE_STREAMS } = mongoCollections;

const ivs = new IVS({
  apiVersion: '2020-07-14',
  region: IVS_REGION,
});

async function expireLiveStream(dbLiveStream, client) {
  try {
    await ivs
      .deleteStreamKey({
        arn: dbLiveStream.aws.streamKeyArn,
      })
      .promise();
  } catch (e) {
    /* Even if that fails, we shall be able to delete the stream, which will delete the key too */
  }

  try {
    await ivs
      .stopStream({
        arn: dbLiveStream.aws.arn,
      })
      .promise();
  } catch (e) {
    /* Do nothing, it was probably stopped... */
  }

  await ivs
    .deleteChannel({
      arn: dbLiveStream.aws.arn,
    })
    .promise();

  await client
    .db()
    .collection(COLL_LIVE_STREAMS)
    .updateOne({ _id: dbLiveStream._id }, { $set: { expired: true } });
}

/* To be used internally only */
export default async () => {
  const client = await MongoClient.connect();
  try {
    const promises = [];

    await client
      .db()
      .collection(COLL_LIVE_STREAMS)
      .find({
        provider: 'aws-ivs',
        expireDateTime: { $lt: new Date() },
        expired: false,
      })
      .forEach((dbLiveStream) => {
        promises.push(expireLiveStream(dbLiveStream, client));
      });

    const results = await Promise.allSettled(promises);
    // eslint-disable-next-line no-console
    console.log('Ran expiration process, results :', results);
  } finally {
    client.close();
  }
};
