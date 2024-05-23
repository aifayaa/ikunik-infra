/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS, COLL_PERM_GROUPS, COLL_PROFILES, COLL_USERS } =
  mongoCollections;

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  const db = client.db();
  try {
    const [profileFromProfile, [profileFromApp]] = await Promise.all([
      db.collection(COLL_PROFILES).findOne(
        {
          UserId: userId,
          appId,
        },
        { projection: { _id: 1 } }
      ),
      /* getProfileFromApp */
      db
        .collection(COLL_USERS)
        .aggregate([
          {
            $match: {
              _id: userId,
            },
          },
          {
            $limit: 1,
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
            $unwind: '$permGroups',
          },
          {
            $match: {
              'permGroups.appId': appId,
              'permGroups.perms.apps_getProfile': true,
            },
          },
          { $limit: 1 },
          {
            $lookup: {
              from: COLL_APPS,
              localField: 'permGroups.appId',
              foreignField: '_id',
              as: 'app',
            },
          },
          {
            $unwind: '$app',
          },
          {
            $lookup: {
              from: COLL_PROFILES,
              localField: 'app.profileId',
              foreignField: '_id',
              as: 'profile',
            },
          },
          {
            $unwind: '$profile',
          },
          {
            $replaceRoot: {
              newRoot: '$profile',
            },
          },
        ])
        .toArray(),
    ]);

    const profile = profileFromProfile || profileFromApp;
    return profile && profile._id;
  } finally {
    client.close();
  }
};
