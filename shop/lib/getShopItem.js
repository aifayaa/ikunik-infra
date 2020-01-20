import MongoClient from '../../libs/mongoClient';

export default async (itemId, appId) => {
  const client = await MongoClient.connect();
  try {
    return await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SHOP_ITEMS)
      .findOne({
        _id: itemId,
        status: 'active',
        appIds: { $elemMatch: { $eq: appId } },
      });
  } finally {
    client.close();
  }
};
