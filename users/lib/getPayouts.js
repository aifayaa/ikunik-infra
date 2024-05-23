/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

// TODO substract rejected payout from others
export default async (userId, profileId, appId) => {
  const client = await MongoClient.connect();
  try {
    const record = await client
      .db()
      .collection(mongoCollections.COLL_PAYOUTS)
      .aggregate([
        {
          $match: {
            profileId,
            appId,
          },
        },
        {
          $group: {
            _id: null,
            totalBaseAmount: { $sum: '$baseAmount' },
            totalFees: { $sum: '$fees' },
            totalCrowdaa: { $sum: '$crowdaa' },
            totalIncome: { $sum: '$income' },
            payouts: { $push: '$$ROOT' },
          },
        },
        {
          $project: {
            _id: 0,
            totalBaseAmount: 1,
            totalFees: 1,
            totalCrowdaa: 1,
            totalIncome: 1,
            payouts: 1,
            unity: { $literal: 'credits' },
            symbol: { $literal: 'credits' },
          },
        },
      ])
      .toArray();
    return record[0];
  } finally {
    client.close();
  }
};
