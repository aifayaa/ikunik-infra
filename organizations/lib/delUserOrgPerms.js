/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  DELETE_OWNER_CODE,
  ERROR_TYPE_FORBIDDEN,
  ERROR_TYPE_NOT_FOUND,
  USER_NOT_FOUND_CODE,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export default async (userId, orgId) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const user = await db
      .collection(COLL_USERS)
      .findOne({ _id: userId, 'perms.organizations._id': orgId });

    // If the target user is not found, Error
    if (!user) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `User '${userId} is not found in organization '${orgId}'.`
      );
    }

    const userOrganizationPerms = user.perms.organizations.find(
      (org) => org._id === orgId
    );

    // If the target user is the owner, don't delete him
    if (userOrganizationPerms) {
      const userRoles = userOrganizationPerms.roles;

      if (userRoles.includes('owner')) {
        throw new CrowdaaError(
          ERROR_TYPE_FORBIDDEN,
          DELETE_OWNER_CODE,
          `User '${userId} is an owner of the organization '${orgId}': cannot be deleted.`
        );
      }
    }

    await db
      .collection(COLL_USERS)
      .updateOne(
        { _id: userId },
        { $pull: { 'perms.organizations': { _id: orgId } } }
      );

    const updatedUser = await db.collection(COLL_USERS).findOne(
      { _id: userId },
      {
        projection: {
          _id: 1,
          createdAt: 1,
          profile: 1,
          perms: 1,
        },
      }
    );

    return updatedUser;
  } finally {
    client.close();
  }
};
