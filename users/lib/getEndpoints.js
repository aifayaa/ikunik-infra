import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  try {
    const endpoints = await client
      .db()
      .collection(mongoCollections.COLL_PUSH_NOTIFICATIONS)
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
