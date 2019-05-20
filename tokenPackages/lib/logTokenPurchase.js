import { MongoClient } from 'mongodb';

export default async (pack, userId, profileId, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const purchase = {
      ...pack,
      userId,
      profileId,
      date: new Date(),
      appIds: [appId],
    };
    delete purchase._id;

    await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_PACKAGE_PURCHASES)
      .insertOne(purchase);
    return true;
  } finally {
    client.close();
  }
};
