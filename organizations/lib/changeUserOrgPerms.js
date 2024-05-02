/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export default async (userId, orgId, data) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const user = await db.collection(COLL_USERS).findOne({ _id: userId });

    // If the target user is a superAdmin, don't change permissions
    const { superAdmin } = user;
    if (superAdmin === true) {
      return user;
    }

    // If the target user is the owner of the group, don't change permissions
    const userOrganizationPerms = user.perms.organizations.find(
      (org) => org._id === orgId
    );

    if (userOrganizationPerms) {
      const userRoles = userOrganizationPerms.roles;

      if (userRoles.includes('owner')) {
        return user;
      }
    }

    const updatedRoles = data.roles;
    const commandRes = await db
      .collection(COLL_USERS)
      .updateOne(
        { _id: userId, 'perms.organizations._id': orgId },
        { $set: { 'perms.organizations.$.roles': updatedRoles } }
      );

    if (commandRes && commandRes.nModified && commandRes.nModified.ok !== 1) {
      throw new Error('update_failed');
    }

    return await db.collection(COLL_USERS).findOne({ _id: userId });
  } finally {
    client.close();
  }
};
