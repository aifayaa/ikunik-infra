import MongoClient from '../../libs/mongoClient';

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  try {
    const selections = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SELECTIONS)
      .find({
        userId,
        appId,
      })
      .toArray();

    return { selections };
  } finally {
    client.close();
  }
};
