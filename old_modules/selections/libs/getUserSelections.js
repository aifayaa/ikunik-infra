import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  try {
    const selections = await client
      .db()
      .collection(mongoCollections.COLL_SELECTIONS)
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
