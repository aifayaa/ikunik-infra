/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { getApplicationOrganizationId } from '../../libs/perms/checkPermsFor.ts';

const { COLL_USERS } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const orgId = await getApplicationOrganizationId(appId);

    // Check if a user is linked to this appId
    const $or = [{ 'perms.apps._id': appId }];

    // If the application is linked to an organization,
    // take it into account in the query
    if (orgId) {
      // Check if an organization of a user is linked to this appId
      $or.push({ 'perms.organizations._id': orgId });
    }

    const users = await db
      .collection(COLL_USERS)
      .find({
        $and: [
          // Filter out superAdmin users
          {
            $or: [
              { 'profile.superAdmin': { $exists: false } },
              { 'profile.superAdmin': false },
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
