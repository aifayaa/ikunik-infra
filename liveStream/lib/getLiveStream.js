import MongoClient from '../../libs/mongoClient';

const {
  COLL_LIVE_STREAM,
  DB_NAME,
} = process.env;

/* To be used internally only */
export default async (appId, liveStreamId) => {
  const client = await MongoClient.connect();
  try {
    return (await client
      .db(DB_NAME)
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
