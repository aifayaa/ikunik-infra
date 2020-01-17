import { MongoClient } from 'mongodb';

export default async (userId, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  try {
    const selections = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SELECTIONS)
      .find({
        userId,
        appIds: { $elemMatch: { $eq: appId } },
      })
      .toArray();

    return { selections };
  } finally {
    client.close();
  }
};
