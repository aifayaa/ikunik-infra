import { MongoClient } from 'mongodb';

export default async (appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  try {
    const items = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SHOP_ITEMS)
      .find({
        status: 'active',
        appIds: { $elemMatch: { $eq: appId } },
      }).toArray();
    return { items };
  } finally {
    client.close();
  }
};
