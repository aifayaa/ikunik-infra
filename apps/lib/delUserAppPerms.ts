/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  USER_NOT_FOUND_CODE,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { getApplicationWithinOrg } from '../../libs/perms/checkPermsFor';
import { UserType } from '../../users/lib/userEntity';
import getAppUsers from './getAppUsers';

const { COLL_APPS } = mongoCollections;

export default async (targetUserId: string, appId: string) => {
  const client = await MongoClient.connect();

  try {
    await getApplicationWithinOrg(appId);

    const users = await getAppUsers(appId);
    const userCandidate = users.find(
      (userWk: UserType) => userWk._id === targetUserId
    );

    if (!userCandidate) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `Cannot found user '${targetUserId}' in application '${appId}'`
      );
    }

    const db = client.db();
    await db
      .collection(COLL_APPS)
      .updateOne(
        { _id: appId },
        { $pull: { 'organization.users': { _id: targetUserId } } }
      );

    return {
      deletedResources: {
        userIds: [targetUserId],
      },
    };
  } finally {
    client.close();
  }
};
