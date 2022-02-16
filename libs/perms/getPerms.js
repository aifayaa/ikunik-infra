import MongoClient from '../mongoClient';
import mongoCollections from '../mongoCollections.json';

const { COLL_USERS, COLL_PERM_GROUPS } = mongoCollections;

export default async (userId, appId) => {
  const pipeline = [
    {
      $match: { _id: userId },
    },
    {
      $lookup: {
        from: COLL_PERM_GROUPS,
        localField: 'permGroupIds',
        foreignField: '_id',
        as: 'permGroups',
      },
    },
    {
      $project: {
        _id: 1,
        permGroups: {
          $filter: {
            input: '$permGroups',
            as: 'permGroup',
            cond: { $eq: [appId, '$$permGroup.appId'] },
          },
        },
      },
    },
  ];
  const client = await MongoClient.connect();
  try {
    const [{ permGroups } = {}] = await client
      .db()
      .collection(COLL_USERS)
      .aggregate(pipeline)
      .toArray();

    const perms = (permGroups || []).reduce((acc, curr) => {
      Object.keys(curr.perms).forEach((key) => {
        if (!acc[key]) {
          acc[key] = curr.perms[key];
        }
      });
      return acc;
    }, {});
    return perms;
  } finally {
    client.close();
  }
};
