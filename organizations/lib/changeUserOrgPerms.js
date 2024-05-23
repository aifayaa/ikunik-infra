/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  ERROR_TYPE_NOT_ALLOWED,
  NOT_ENOUGH_PERMISSIONS_CODE,
  AT_LEAST_ONE_OWNER_CODE,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  getHighestRole,
  getHighestRoleAux,
  organizationRoles,
} from './organizationsUtils';

const { COLL_USERS } = mongoCollections;

/**
 * Compare permisions
 * @param {string} perm0 A permission, may be 'owner', 'admin' or 'member'
 * @param {string} perm1 A permission, may be 'owner', 'admin' or 'member'
 * @returns true, if 'perm0' is stronger than 'perm1'
 */
function isPermissionStrongerOrEqual(perm0, perm1) {
  const perm0Ranking = organizationRoles.indexOf(perm0);
  const perm1Ranking = organizationRoles.indexOf(perm1);

  // Lower ranking is stronger permission
  return perm0Ranking <= perm1Ranking;
}

export async function isSourceUserAllowToGiveRole(
  db,
  sourceUserId,
  targetUserId,
  updatedRoles,
  orgId
) {
  const sourceUserHighestRole = await getHighestRole(db, sourceUserId, orgId);
  const targetUserHighestRole = await getHighestRole(db, targetUserId, orgId);

  // If the sourceUser doesn't have enough permissions to modify the targetUser: exit
  if (
    !isPermissionStrongerOrEqual(sourceUserHighestRole, targetUserHighestRole)
  ) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_ALLOWED,
      NOT_ENOUGH_PERMISSIONS_CODE,
      `User '${sourceUserId}' with role '${sourceUserHighestRole}' cannot modify permissions of target ` +
        `user '${targetUserId}' with role '${targetUserHighestRole}'`
    );
  }

  // If the updatedRoles is stronger than the role of sourceUser: exit
  const highestUpdatedRoles = getHighestRoleAux(updatedRoles);
  if (
    !isPermissionStrongerOrEqual(sourceUserHighestRole, highestUpdatedRoles)
  ) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_ALLOWED,
      NOT_ENOUGH_PERMISSIONS_CODE,
      `User '${sourceUserId}' with role '${sourceUserHighestRole}' cannot set the permission '${highestUpdatedRoles}'`
    );
  }
}

// TODO: check the case where the sourceUser is a superAdmin
/**
 * Update permissions of a user in an organization.
 * Contraints:
 *  - An 'admin' can change the permission for another 'admin' or 'member',
 *  - An 'owner' can change the permission for another 'owner', 'admin' or 'member',
 *  - An 'admin' can add/remove the permissions 'admin' or 'member',
 *  - An 'owner' can add/remove the permissions 'owner', 'admin' or 'member',
 *  - An organization must always have at least an owner.
 *
 * @param {string} sourceUserId The user ID of the user which requests the change of permission
 * @param {string} targetUserId The user ID of the user to update the permission
 * @param {string} orgId The organization ID
 * @param {string[]} updatedRoles The array of permissions to apply to targetUserId. Contains 'owner', 'admin' or 'member'
 */
export default async (sourceUserId, targetUserId, orgId, updatedRoles) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const targetUserHighestRole = await isSourceUserAllowToGiveRole(
      db,
      sourceUserId,
      targetUserId,
      updatedRoles,
      orgId
    );

    // Check the case where the organization orgId will lost an owner.
    // Context:
    //  - the targetUser is an 'owner'
    //  - the new permissions doesn't involve the 'owner' role
    const highestRight = organizationRoles[0];
    if (
      targetUserHighestRole === highestRight &&
      !updatedRoles.includes(highestRight)
    ) {
      const orgUsers = await db
        .collection(COLL_USERS)
        .find({ 'perms.organizations._id': orgId })
        .toArray();

      const nbOwner = orgUsers
        .map(
          (user) =>
            user.perms.organizations.find((org) => org._id === orgId).roles
        )
        .filter((roles) => roles.includes(highestRight))
        .filter(Boolean).length;

      // Currently, if the organization orgId has only one owner: exit
      if (nbOwner === 1) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          AT_LEAST_ONE_OWNER_CODE,
          `User '${targetUserId}' is the only owner of organization '${orgId}'. ` +
            `Cannot change its permissions to '${updatedRoles}'.`
        );
      }
    }

    // Update the permission of the targetUser
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
