import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (itemId, appId) => {
  const client = await MongoClient.connect();
  try {
    return await client
      .db()
      .collection(mongoCollections.COLL_SHOP_ITEMS)
      .findOne({
        _id: itemId,
        status: 'active',
        appId,
      });
  } finally {
    client.close();
  }
};
