/* eslint-disable import/no-relative-packages */

import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export const organizationRoles = ['owner', 'admin', 'member'];

export const applicationRolesInOrganization = [
  'admin',
  'editor',
  'moderator',
  'viewer',
];

async function getUserPermsOnOrg(db, userId, orgId) {
  const user = await db.collection(COLL_USERS).findOne({ _id: userId });

  return user.perms.organizations.find((org) => org._id === orgId).roles;
}

export function getHighestRoleAux(roles) {
  for (const role of organizationRoles) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return organizationRoles.at(-1);
}

export async function getHighestRole(db, userId, orgId) {
  const userRoles = await getUserPermsOnOrg(db, userId, orgId);
  return getHighestRoleAux(userRoles);
}
