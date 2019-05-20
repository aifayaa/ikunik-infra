import { MongoClient } from 'mongodb';

export default async (appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const stages = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_STAGES)
      .find({ appIds: { $elemMatch: { $eq: appId } } })
      .toArray();
    return stages;
  } finally {
    client.close();
  }
};
