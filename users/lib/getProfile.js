import { MongoClient } from 'mongodb';

export default async (userId, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  try {
    const profile = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_PROFILES)
      .findOne({
        UserId: userId,
        appIds: { $elemMatch: { $eq: appId } },
      });
    return profile;
  } finally {
    client.close();
  }
};
