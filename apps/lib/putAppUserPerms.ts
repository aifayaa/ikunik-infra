/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  USER_ALREADY_EXISTS_CODE,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient.js';
import mongoCollections from '../../libs/mongoCollections.json';
import { getApplicationWithinOrg } from '../../libs/perms/checkPermsFor';
import { AppsPermWithoutOwnerType } from '../../libs/perms/permEntities';

const { COLL_APPS } = mongoCollections;

export default async (
  appId: string,
  roles: Array<AppsPermWithoutOwnerType>,
  targetUserId: string
) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const app = await getApplicationWithinOrg(appId);

    const userCandidate = app.organization?.users.find(
      (user) => user._id === targetUserId
    );

    if (!userCandidate) {
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
