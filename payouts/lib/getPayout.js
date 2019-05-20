import { MongoClient } from 'mongodb';

export default async (id, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    return await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_PAYOUTS)
      .findOne({
        _id: id,
        appIds: { $elemMatch: { $eq: appId } },
      });
  } finally {
    client.close();
  }
};
