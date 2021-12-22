import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_LIVE_STREAM } = mongoCollections;

/* To be used internally only */
export default async (appId, liveStreamId) => {
  const client = await MongoClient.connect();
  try {
    return (await client
      .db()
      .collection(COLL_LIVE_STREAM)
      .findOne({
        _id: liveStreamId,
        appId,
        provider: 'aws-ivs',
      }));
  } finally {
    client.close();
  }
};
