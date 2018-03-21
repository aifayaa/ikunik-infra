import { MongoClient } from 'mongodb';
import round from 'mongo-round';

const doGetFees = async () => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const res = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
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

export const handleGetFees = async (event, context, callback) => {
  try {
    const results = await doGetFees();
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify(e.message),
    };
    callback(null, response);
  }
};
