/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS, COLL_USERS } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();

  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne({ _id: appId }, { projection: { orgId: 1 } });

    if (!app) {
      throw new Error('app_not_found');
    }

    // Check if a user is linked to this appId
    const $or = [{ 'perms.apps._id': appId }];

    const { orgId } = app;

    // If the application is linked to an organization,
    // take it into account in the query
    if (orgId) {
      // Check if an organization of a user is linked to this appId
      $or.push({ 'perms.orgs._id': orgId });
    }

    const users = await client
      .db()
      .collection(COLL_USERS)
      .find({
        $and: [
          // Filter out SuperAdmin users
          {
            $or: [
              { 'profile.isSuperAdmin': false },
              { 'profile.isSuperAdmin': { $exists: false } },
            ],
          },
          {
            $or,
          },
        ],
      })
      .project({ 'profile.email': 1 })
      .toArray();

    return users;
  } finally {
    client.close();
  }
};
