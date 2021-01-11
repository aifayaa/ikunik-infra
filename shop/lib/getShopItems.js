import MongoClient from '../../libs/mongoClient';

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const items = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SHOP_ITEMS)
      .find({
        status: 'active',
        appId,
      }).toArray();
    return { items };
  } finally {
    client.close();
  }
};
