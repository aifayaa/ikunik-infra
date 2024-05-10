/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export default async (targetUserId, orgId, updatedRoles) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    // TODO: check if the change can be applied: at least one owner must remain
    // on the organization after the change is applied

    // An 'admin' can change the permission for another 'admin' or 'member'
    // An 'admin' can add/remove the permissions 'admin' or 'member'
    // an 'owner' can change the permission for another 'owner', 'admin' or 'member'
    // an 'owner' can add/remove the permissions 'owner', 'admin' or 'member'

    const targetUser = await db
      .collection(COLL_USERS)
      .findOne({ _id: targetUserId });

    // If the target user is a superAdmin, don't change permissions
    const { superAdmin } = targetUser;
    if (superAdmin === true) {
      return targetUser;
    }

    // If the target user is the owner of the group, don't change permissions
    const userOrganizationPerms = targetUser.perms.organizations.find(
      (org) => org._id === orgId
    );

    if (userOrganizationPerms) {
      const userRoles = userOrganizationPerms.roles;

      if (userRoles.includes('owner')) {
        return targetUser;
      }
    }

    await db
      .collection(COLL_USERS)
      .updateOne(
        { _id: targetUserId, 'perms.organizations._id': orgId },
        { $set: { 'perms.organizations.$.roles': updatedRoles } }
      );

    return await db.collection(COLL_USERS).findOne({ _id: targetUserId });
  } finally {
    client.close();
  }
};
