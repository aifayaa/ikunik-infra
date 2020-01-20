import round from 'mongo-round';
import MongoClient from '../../libs/mongoClient';

export default async () => {
  const client = await MongoClient.connect();
  try {
    const res = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_BILLING)
      .aggregate([
        { $match: { status: 'paid' } },
        {
          $group: {
            _id: '$provider',
            revenue: { $sum: '$amount' },
            fees: { $sum: '$fees' },
          },
        },
        {
          $group: {
            _id: null,
            globalRevenue: { $sum: '$revenue' },
            globalFees: { $sum: '$fees' },
            providers: {
              $push: {
                provider: '$_id',
                avgFees: round({ $multiply: [{ $divide: ['$fees', '$revenue'] }, 100] }, 2),
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            providers: 1,
            unityName: { $literal: 'percentage' },
            unitySymbol: { $literal: '%' },
            globalAvgFees: round({ $multiply: [{ $divide: ['$globalFees', '$globalRevenue'] }, 100] }, 2),
          },
        },
      ]).toArray();
    return res[0]; // agregate return array with only an item
  } finally {
    client.close();
  }
};
