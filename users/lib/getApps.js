import MongoClient from '../../libs/mongoClient';

export default async (userId, { sortBy, sortOrder } = {}) => {
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
      $group: {
        _id: '$appOfPermGroup',
      },
    },
    {
      $replaceRoot: {
        newRoot: { $mergeObjects: '$_id' },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
      },
    },
  ];
  if (sortBy && sortOrder) pipeline.push({ $sort: { [sortBy]: (sortOrder === 'desc' ? 1 : -1) } });
  try {
    const appsOwnedByUser = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_USERS)
      .aggregate(pipeline, { collation: { locale: 'en' } })
      .toArray();

    return appsOwnedByUser;
  } finally {
    client.close();
  }
};
