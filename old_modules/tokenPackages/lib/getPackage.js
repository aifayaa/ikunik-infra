import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (packageId, appId) => {
  const client = await MongoClient.connect();
  try {
    return await client
      .db()
      .collection(mongoCollections.COLL_TOKEN_PACKAGES)
      .findOne({
        _id: packageId,
        appId,
      });
  } finally {
    client.close();
  }
};
