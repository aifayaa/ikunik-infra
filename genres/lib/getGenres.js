import { MongoClient } from 'mongodb';

export default async (appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const genres = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_GENRES)
      .find({ appIds: { $elemMatch: { $eq: appId } } })
      .toArray();
    return { genres };
  } finally {
    client.close();
  }
};
