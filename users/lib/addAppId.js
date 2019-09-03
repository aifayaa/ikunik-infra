import { MongoClient } from 'mongodb';

export default async (userId, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const { value } = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_USERS)
      .updateOne(
        { _id: userId },
        { $addToSet: { appIds: appId } },
      );
    return value;
  } finally {
    client.close();
  }
};
