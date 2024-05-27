/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  AT_LEAST_ONE_ADMIN_CODE,
  ERROR_TYPE_NOT_ALLOWED,
  NOT_ENOUGH_PERMISSIONS_CODE,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { getApplicationWithinOrg } from '../../libs/perms/checkPermsFor.ts';
import { applicationRolesInOrganization } from '../../organizations/lib/organizationsUtils.ts';

const { COLL_APPS } = mongoCollections;

async function getUserPermsOnApplication(db, userId, appId) {
  const application = await db.collection(COLL_APPS).findOne({ _id: appId });

  return application.organization.users.find((user) => user._id === userId)
    .roles;
}

function getHighestRoleAux(roles) {
  for (const role of applicationRolesInOrganization) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return applicationRolesInOrganization.at(-1);
}

async function getHighestRole(db, userId, appId) {
  const userRoles = await getUserPermsOnApplication(db, userId, appId);
  return getHighestRoleAux(userRoles);
}

/**
 * Compare permisions
 * @param {string} perm0 A permission, may be 'owner', 'admin' or 'member'
 * @param {string} perm1 A permission, may be 'owner', 'admin' or 'member'
 * @returns true, if 'perm0' is stronger than 'perm1'
 */
function isPermissionStrongerOrEqual(perm0, perm1) {
  const perm0Ranking = applicationRolesInOrganization.indexOf(perm0);
  const perm1Ranking = applicationRolesInOrganization.indexOf(perm1);

  // Lower ranking is stronger permission
  return perm0Ranking <= perm1Ranking;
}

export async function isSourceUserAllowToGiveRole(
  db,
  sourceUserId,
  targetUserId,
  updatedRoles,
  appId
) {
  const sourceUserHighestRole = await getHighestRole(db, sourceUserId, appId);
  const targetUserHighestRole = await getHighestRole(db, targetUserId, appId);

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

// TODO: an admin must always remain on an application
/**
 * Update permissions of a user for an application in an organization.
 * Contraints:
 *  - An 'admin'     can change the permission for another 'admin', 'editor', 'moderator' or 'viewer',
 *  - An 'editor'    can change the permission for another 'editor', 'moderator' or 'viewer',
 *  - An 'moderator' can change the permission for another 'moderator' or 'viewer',
 *  - An 'admin'     can add/remove the permissions 'admin', 'editor', 'moderator' or 'viewer',
 *  - An 'editor'    can add/remove the permissions 'editor', 'moderator' or 'viewer',
 *  - An 'moderator' can add/remove the permissions 'moderator' or 'viewer',
 *  - An organization must always have at least an admin.
 *
 * @param {string} sourceUserId The user ID of the user which requests the change of permission
 * @param {string} targetUserId The user ID of the user to update the permission
 * @param {string} orgId The organization ID
 * @param {string[]} updatedRoles The array of permissions to apply to targetUserId.
 *                                Contains 'admin', 'editor', 'moderator' or 'viewer'
 */
export default async (sourceUserId, targetUserId, appId, updatedRoles) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    await isSourceUserAllowToGiveRole(
      db,
      sourceUserId,
      targetUserId,
      updatedRoles,
      appId
    );

    const app = await getApplicationWithinOrg(appId);

    const targetUserHighestRole = await getHighestRole(db, targetUserId, appId);

    // Check the case where the application orgId will lost an admin.
    // Context:
    //  - the targetUser is an 'admin'
    //  - the new permissions doesn't involve the 'admin' role
    const highestRight = applicationRolesInOrganization[0];
    if (
      targetUserHighestRole === highestRight &&
      !updatedRoles.includes(highestRight)
    ) {
      const appUsers = app.organization.users;

      const nbAdmin = appUsers
        .map((user) => user.roles)
        .filter((roles) => roles.includes(highestRight))
        .filter(Boolean).length;

      // Currently, if the organization orgId has only one owner: exit
      if (nbAdmin === 1) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          AT_LEAST_ONE_ADMIN_CODE,
          `User '${targetUserId}' is the only admin of application '${appId}'. ` +
            `Cannot change its permissions to '${updatedRoles}'.`
        );
      }
    }

    await db.collection(COLL_APPS).updateOne(
      { _id: appId, 'organization.users._id': targetUserId },
      {
        $set: {
          'organization.users.$': { _id: targetUserId, roles: updatedRoles },
        },
      }
    );

    return await getApplicationWithinOrg(appId);
  } finally {
    client.close();
  }
};
