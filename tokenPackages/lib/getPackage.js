import { MongoClient } from 'mongodb';

export default async (packageId, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  try {
    return await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_TOKEN_PACKAGES)
      .findOne({
        _id: packageId,
        appIds: { $elemMatch: { $eq: appId } },
      });
  } finally {
    client.close();
  }
};
