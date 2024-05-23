/* eslint-disable import/no-relative-packages */
import MongoClient from '../mongoClient.ts';
import mongoCollections from '../mongoCollections.json';

const { COLL_USERS, COLL_PERM_GROUPS } = mongoCollections;

const ALL_PERMS = {
  apps_getInfos: true,
  apps_getProfile: true,
  crowd_blast: true,
  files_upload: true,
  pressArticles_all: true,
  pressCategories_all: true,
  search_press: true,
  userGeneratedContents_all: true,
  userGeneratedContents_notify: true,
};

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
        superAdmin: 1,
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
    const [{ permGroups, superAdmin = false } = {}] = await client
      .db()
      .collection(COLL_USERS)
      .aggregate(pipeline)
      .toArray();

    if (superAdmin) {
      return ALL_PERMS;
    }

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
