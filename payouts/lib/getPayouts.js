import MongoClient from '../../libs/mongoClient';

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const selector = {
      state: { $in: ['processing', 'pending'] },
      appIds: appId,
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
