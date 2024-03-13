/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { indexObjectArrayWithKey } from '../../libs/utils';

const { ADMIN_APP } = process.env;

const { COLL_APPS, COLL_PERM_GROUPS, COLL_USERS } = mongoCollections;

export default async (
  appId,
  {
    groups = ['admins', 'moderators', 'crowd_managers'],
    userProjection = {
      _id: 1,
      'emails.address': 1,
      'profile.firstname': 1,
      'profile.lastname': 1,
    },
  } = {}
) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const app = await db.collection(COLL_APPS).findOne({ _id: appId });

    if (!app) {
      throw new Error('app_not_found');
    }

    const [permGroupsResults] = await Promise.all([
      Promise.all(
        groups.map((group) =>
          db.collection(COLL_PERM_GROUPS).findOne({
            appId,
            name: { $regex: new RegExp(`.*_${group}$`) },
          })
        )
      ),
    ]);

    const permGroupIds = permGroupsResults
      .filter((pg) => pg)
      .map((result) => result._id);

    const admins = {};
    if (permGroupIds.length > 0) {
      const userQuery = {
        appId: ADMIN_APP,
        permGroupIds: { $in: permGroupIds },
      };
      const adminsList = await db
        .collection(COLL_USERS)
        .find(userQuery, { projection: userProjection })
        .toArray();

      if (adminsList.length > 0) {
        indexObjectArrayWithKey(adminsList, '_id', admins);
      }
    }

    if (app.orgId) {
      const adminsList = await db
        .collection(COLL_USERS)
        .find({ 'perms.orgs._id': app.orgId }, { projection: userProjection })
        .toArray();

      if (adminsList.length > 0) {
        indexObjectArrayWithKey(adminsList, '_id', admins);
      }
    }

    const adminsList = await db
      .collection(COLL_USERS)
      .find({ 'perms.apps._id': app._id }, { projection: userProjection })
      .toArray();

    if (adminsList.length > 0) {
      indexObjectArrayWithKey(adminsList, '_id', admins);
    }

    return Object.values(admins);
  } finally {
    client.close();
  }
};
