import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    return await client
      .db()
      .collection(mongoCollections.COLL_MAINTENANCE)
      .findOne({
        active: true,
        appId,
      });
  } finally {
    client.close();
  }
};
