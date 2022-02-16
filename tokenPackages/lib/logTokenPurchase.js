import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (pack, userId, profileId, appId) => {
  const client = await MongoClient.connect();
  try {
    const purchase = {
      ...pack,
      userId,
      profileId,
      date: new Date(),
      appId,
    };
    delete purchase._id;

    await client
      .db()
      .collection(mongoCollections.COLL_PACKAGE_PURCHASES)
      .insertOne(purchase);
    return true;
  } finally {
    client.close();
  }
};
