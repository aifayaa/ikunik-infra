import MongoClient from '../../libs/mongoClient';

export default async (subId, appId) => {
  const client = await MongoClient.connect();
  try {
    const sub = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SUBSCRIPTIONS)
      .findOne({
        _id: subId,
        appId,
      });
    return sub;
  } finally {
    client.close();
  }
};
