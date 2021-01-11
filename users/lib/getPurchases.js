import MongoClient from '../../libs/mongoClient';

export default async (_userId, profileId, appId) => {
  const client = await MongoClient.connect();
  try {
    const record = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_PROJECTS)
      .aggregate([
        {
          $match: {
            profil_ID: profileId,
            appId,
          },
        },
        {
          $lookup: {
            from: process.env.COLL_PURCHASES,
            localField: '_id',
            foreignField: 'purchase.project_ID',
            as: 'purchases',
          },
        },
        {
          $unwind: {
            path: '$purchases',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            projects: 1,
            purchases: { $ifNull: ['$purchases', { purchase: { project_ID: '$_id' } }] },
          },
        },
        {
          $group: {
            _id: '$purchases.purchase.project_ID',
            projectName: { $first: '$projectName' },
            purchases: { $sum: '$purchases.purchase.price' },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$purchases' },
            projects: { $push: { _id: '$_id', projectName: '$projectName', purchases: '$purchases' } },
          },
        },
        {
          $project: {
            _id: 0,
            total: 1,
            projects: 1,
            unity: { $literal: 'credits' },
            symbol: { $literal: 'credits' },
          },
        },
      ]).toArray();
    return record[0];
  } finally {
    client.close();
  }
};
