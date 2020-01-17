import { MongoClient } from 'mongodb';

export default async (appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  try {
    return await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_MAINTENANCE)
      .findOne({
        active: true,
        appIds: { $elemMatch: { $eq: appId } },
      });
  } finally {
    client.close();
  }
};
