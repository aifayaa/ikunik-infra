import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const selector = {
      state: { $in: ['processing', 'pending'] },
      appId,
    };

    const payouts = await client
      .db()
      .collection(mongoCollections.COLL_PAYOUTS)
      .find(selector)
      .toArray();
    return { payouts };
  } finally {
    client.close();
  }
};
