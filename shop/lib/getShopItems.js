import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const items = await client
      .db()
      .collection(mongoCollections.COLL_SHOP_ITEMS)
      .find({
        status: 'active',
        appId,
      }).toArray();
    return { items };
  } finally {
    client.close();
  }
};
