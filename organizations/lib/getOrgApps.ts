/* eslint-disable import/no-relative-packages */
import { appPrivateFieldsProjection } from '../../apps/lib/appsUtils';
import MongoClient from '../../libs/mongoClient.js';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  getUserOrganizationHighestRole,
  getUserPermsOnOrganization,
} from '../../libs/perms/checkPermsFor';
import { getUser } from '../../users/lib/usersUtils';

const { COLL_APPS } = mongoCollections;

export default async (orgId: string, userId: string) => {
  const client = await MongoClient.connect();

  try {
    const user = await getUser(userId);

    const { roles } = getUserPermsOnOrganization(user, orgId);

    const userHighestRole = getUserOrganizationHighestRole(roles);

    const selector: {
      'organization._id': string;
      'organization.users._id'?: string;
    } = { 'organization._id': orgId };
    if (userHighestRole === 'member') {
      selector['organization.users._id'] = userId;
    }

    return await client
      .db()
      .collection(COLL_APPS)
      .find(selector, {
        projection: appPrivateFieldsProjection,
      })
      .toArray();
  } finally {
    client.close();
  }
};
