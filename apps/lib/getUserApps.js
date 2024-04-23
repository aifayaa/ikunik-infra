/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS, COLL_USERS } = mongoCollections;

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

    const orgIds =
      user.perms && user.perms.orgs
        ? user.perms.orgs.map(({ _id }) => _id)
        : [];
    const orgsApps = await db
      .collection(COLL_APPS)
      .find({ orgId: { $in: orgIds } })
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
