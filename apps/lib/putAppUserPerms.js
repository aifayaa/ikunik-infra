/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  ERROR_TYPE_NOT_FOUND,
  USER_ALREADY_EXISTS_CODE,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import { getApplicationWithinOrg } from '../../libs/perms/checkPermsFor.ts';
import { indexObjectArrayWithKey } from '../../libs/utils';

const { COLL_APPS } = mongoCollections;

export default async (appId, roles, targetUserId) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const app = await getApplicationWithinOrg(appId);

    const appsOrganizationUsers = indexObjectArrayWithKey(
      app.organization.users
    );

    if (appsOrganizationUsers[targetUserId]) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_ALREADY_EXISTS_CODE,
        `The user '${targetUserId}' already exists in application '${appId}'`
      );
    }

    await db
      .collection(COLL_APPS)
      .findOneAndUpdate(
        { _id: appId },
        { $push: { 'organization.users': { _id: targetUserId, roles } } }
      );

    return await getApplicationWithinOrg(appId);
  } finally {
    client.close();
  }
};
