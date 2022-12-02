import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (scannerId, appId) => {
  const client = await MongoClient.connect();
  try {
    return await client
      .db()
      .collection(mongoCollections.COLL_SCANNERS)
      .findOne({
        _id: scannerId,
        appId,
      });
  } finally {
    client.close();
  }
};
