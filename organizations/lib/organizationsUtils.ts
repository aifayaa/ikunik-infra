/* eslint-disable import/no-relative-packages */

import mongoCollections from '../../libs/mongoCollections.json';
import MongoClient from '../../libs/mongoClient';
import { OrganizationType } from './organizationEntity';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_ACCESS,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  ORGANIZATION_NOT_FOUND_CODE,
  ORGANIZATION_PERMISSION_CODE,
  USER_NO_PERMISSIONS_CODE,
} from '../../libs/httpResponses/errorCodes';
import { UserType } from '../../users/lib/userEntity';
import {
  AppsPermWithoutOwnerType,
  OrganizationPermType,
} from '../../libs/perms/permEntities';

const { COLL_USERS, COLL_ORGANIZATIONS } = mongoCollections;

export async function getOrganization(
  orgId: string
): Promise<OrganizationType> {
  const client = await MongoClient.connect();
  try {
    const db = client.db();
    const org = await db.collection(COLL_ORGANIZATIONS).findOne({ _id: orgId });

    if (!org) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        ORGANIZATION_NOT_FOUND_CODE,
        `The organization '${orgId}' is not found`,
        {
          details: {
            orgId,
          },
        }
      );
    }

    return org;
  } finally {
    client.close();
  }
}

export const organizationRoles: Array<OrganizationPermType> = [
  'owner',
  'admin',
  'member',
];

export const applicationRolesInOrganization = [
  'admin',
  'editor',
  'moderator',
  'viewer',
] as AppsPermWithoutOwnerType[];

async function getUserPermsOnOrg(db: any, userId: string, orgId: string) {
  const user: UserType = await db
    .collection(COLL_USERS)
    .findOne({ _id: userId });

  if (user.superAdmin) {
    return ['owner'] as OrganizationPermType[];
  }

  if (!user.perms) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_ALLOWED,
      USER_NO_PERMISSIONS_CODE,
      `User '${user._id}' do not have permission`
    );
  }

  if (!user.perms.organizations) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_ALLOWED,
      USER_NO_PERMISSIONS_CODE,
      `User '${user._id}' is not part of any organization`
    );
  }

  const organizationCandidate = user.perms.organizations.find(
    (org) => org._id === orgId
  );

  if (!organizationCandidate) {
    throw new CrowdaaError(
      ERROR_TYPE_ACCESS,
      ORGANIZATION_PERMISSION_CODE,
      `User '${user._id}' is not part of organization '${orgId}'`
    );
  }

  return organizationCandidate.roles;
}

export function getHighestRoleAux(roles: Array<OrganizationPermType>) {
  for (const role of organizationRoles) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return organizationRoles.at(-1);
}

export async function getHighestRole(db: any, userId: string, orgId: string) {
  const userRoles = await getUserPermsOnOrg(db, userId, orgId);
  return getHighestRoleAux(userRoles);
}
