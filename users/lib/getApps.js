import MongoClient from '../../libs/mongoClient';

export default async (userId) => {
  const client = await MongoClient.connect();
  const pipeline = [
    {
      $match: {
        _id: userId,
      },
    },
    {
      $lookup: {
        from: process.env.COLL_PERM_GROUPS,
        localField: 'permGroupIds',
        foreignField: '_id',
        as: 'permGroup',
      },
    },
    { $unwind: '$permGroup' },
    {
      $lookup: {
        from: process.env.COLL_APPS,
        localField: 'permGroup.appId',
        foreignField: '_id',
        as: 'appOfPermGroup',
      },
    },
    {
      $replaceRoot: {
        newRoot: { $mergeObjects: ['$appOfPermGroup'] },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
      },
    },
  ];

  try {
    const appsOwnedByUser = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_USERS)
      .aggregate(pipeline)
      .toArray();

    return appsOwnedByUser;
  } finally {
    client.close();
  }
};
