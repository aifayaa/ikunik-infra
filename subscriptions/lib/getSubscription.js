import { MongoClient } from 'mongodb';

export default async (subId, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  try {
    const sub = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SUBSCRIPTIONS)
      .findOne({
        _id: subId,
        appIds: { $elemMatch: { $eq: appId } },
      });
    return sub;
  } finally {
    client.close();
  }
};
