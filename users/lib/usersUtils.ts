/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  USER_NOT_FOUND_CODE,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { OrganizationPermType } from '../../libs/perms/permEntities';
import { objUnset } from '../../libs/utils';
import { UserType } from './userEntity';

const { COLL_USERS } = mongoCollections;

export async function getUser(userId: string, options: Object = {}) {
  const client = await MongoClient.connect();

  const db = client.db();

  const user = await db
    .collection(COLL_USERS)
    .findOne({ _id: userId }, options);

  // If the target user is not found, Error
  if (!user) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      USER_NOT_FOUND_CODE,
      `Cannot found user '${userId}'`
    );
  }

  return user;
}

export async function getUserAdminPerms(userId: string) {
  return getUser(userId, { projection: { superAdmin: 1, perms: 1 } });
}

export const userPrivateFields = ['services', 'perms', 'superAdmin'];

export const userPrivateFieldsProjection = userPrivateFields.reduce(
  (acc, field) => {
    acc[field] = 0;
    return acc;
  },
  {} as { [key: string]: number }
);

export function filterUserPrivateFields(user: UserType) {
  // Deep duplication required to avoid modifying the source
  const ret = JSON.parse(JSON.stringify(user));

  userPrivateFields.forEach((field) => {
    objUnset(ret, field);
  });

  return ret;
}

export function addUserOrganisationRoles(
  user: UserType,
  orgId: string
): UserType & { roles: Array<OrganizationPermType> } {
  const { superAdmin } = user;
  if (superAdmin) {
    return { ...user, roles: ['owner'] };
  }

  const candidateOrganization = user.perms?.organizations?.find(
    (org) => org._id === orgId
  );

  if (!candidateOrganization) {
    return { ...user, roles: [] };
  } else {
    const { roles } = candidateOrganization;
    return { ...user, roles };
  }
}
