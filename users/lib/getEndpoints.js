import { MongoClient } from 'mongodb';

export default async (userId, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const endpoints = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_PUSH_NOTIFICATIONS)
      .find({
        userId,
        appIds: { $elemMatch: { $eq: appId } },
      })
      .toArray();
    return endpoints;
  } finally {
    client.close();
  }
};
