/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS, COLL_USERS, COLL_ORGANIZATIONS } = mongoCollections;

export default async (userId) => {
  const client = await MongoClient.connect();
  try {
    const db = client.db();
    const user = await db.collection(COLL_USERS).findOne({ _id: userId });

    const userAppIds =
      user.perms && user.perms.apps
        ? user.perms.apps.map(({ _id }) => _id)
        : [];
    const userApps = await db
      .collection(COLL_APPS)
      .find({ _id: { $in: userAppIds } })
      .toArray();

    const userOrgsWithApps =
      user.perms && user.perms.orgs
        ? user.perms.orgs.filter((org) => org.apps)
        : [];
    const userOrgIds = userOrgsWithApps.map(({ _id }) => _id);

    const orgsWithApps = await db
      .collection(COLL_ORGANIZATIONS)
      .find({ _id: { $in: userOrgIds }, apps: { $exists: true } })
      .toArray();

    const orgsAppsIds = orgsWithApps
      .map((org) => org.apps.map(({ _id }) => _id))
      .flat();

    const orgsApps = await db
      .collection(COLL_APPS)
      .find({ _id: { $in: orgsAppsIds } })
      .toArray();

    const response = {
      apps: userApps || [],
      orgsApps: orgsApps || [],
    };

    return response;
  } finally {
    client.close();
  }
};
