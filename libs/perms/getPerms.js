import { MongoClient } from 'mongodb';

const { DB_NAME, COLL_USERS, COLL_PERM_GROUPS, MONGO_URL } = process.env;

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
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
  try {
    const [{ permGroups } = {}] = await client
      .db(DB_NAME)
      .collection(COLL_USERS)
      .aggregate(pipeline)
      .toArray();

    const perms = permGroups.reduce((acc, curr) => {
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
