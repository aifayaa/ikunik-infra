import { MongoClient } from 'mongodb';

export default async (appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selector = {
      state: { $in: ['processing', 'pending'] },
      appIds: { $elemMatch: { $eq: appId } },
    };

    const payouts = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_PAYOUTS)
      .find(selector)
      .toArray();
    return { payouts };
  } finally {
    client.close();
  }
};
