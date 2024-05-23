/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { objUnset } from '../../libs/utils';

const { COLL_USERS } = mongoCollections;

export async function getUser(userId) {
  const client = await MongoClient.connect();

  const db = client.db();

  const user = await db
    .collection(COLL_USERS)
    .findOne({ _id: userId }, { projection: { superAdmin: 1, perms: 1 } });

  return user;
}

export const userPrivateFields = ['services', 'perms', 'superAdmin'];

export const userPrivateFieldsProjection = userPrivateFields.reduce(
  (acc, field) => {
    acc[field] = 0;
    return acc;
  },
  {}
);

export function filterUserPrivateFields(user) {
  // Deep duplication required to avoid modifying the source
  const ret = JSON.parse(JSON.stringify(user));

  userPrivateFields.forEach((field) => {
    objUnset(ret, field);
  });

  return ret;
}

export function addUserOrganisationRoles(user, orgId) {
  const candidateOrganization = user.perms.organizations.find(
    (org) => org._id === orgId
  );

  if (!candidateOrganization) {
    return { ...user, roles: [] };
  } else {
    const { roles } = candidateOrganization;
    return { ...user, roles };
  }
}
