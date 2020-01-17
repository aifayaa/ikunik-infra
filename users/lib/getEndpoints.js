import MongoClient from '../../libs/mongoClient'

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  try {
    const endpoints = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_PUSH_NOTIFICATIONS)
      .find({
        userId,
        appId,
      })
      .toArray();
    return endpoints;
  } finally {
    client.close();
  }
};
