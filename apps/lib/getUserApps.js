/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS, COLL_USERS } = mongoCollections;

export default async (userId) => {
  const client = await MongoClient.connect();
  try {
    const db = client.db();
    const user = await db.collection(COLL_USERS).findOne({ _id: userId });

    if (!user) {
      throw new Error('user_not_found');
    }

    const userAppIds =
      user.perms && user.perms.apps
        ? user.perms.apps.map(({ _id }) => _id)
        : [];
    const userApps = await db
      .collection(COLL_APPS)
      .find({ _id: { $in: userAppIds } })
      .toArray();

    const userOrgIds =
      user.perms && user.perms.organizations
        ? user.perms.organizations.map(({ _id }) => _id)
        : [];
    const orgsApps = await db
      .collection(COLL_APPS)
      .find({ 'organization._id': { $in: userOrgIds } })
      .toArray();

    const response = {
      apps: userApps || [],
      organizationsApps: orgsApps || [],
    };

    return response;
  } finally {
    client.close();
  }
};
