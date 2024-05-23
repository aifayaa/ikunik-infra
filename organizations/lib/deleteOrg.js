/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  ERROR_TYPE_NOT_ALLOWED,
  ORGANISATION_STILL_CONTAINS_APPLICATION_CODE,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS, COLL_USERS, COLL_APPS } = mongoCollections;

export default async (orgId) => {
  const client = await MongoClient.connect();

  const db = client.db();
  const appsCount = await db
    .collection(COLL_APPS)
    .find({ 'organization._id': orgId }, { name: 1 })
    .count();

  if (appsCount > 0) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_ALLOWED,
      ORGANISATION_STILL_CONTAINS_APPLICATION_CODE,
      `Cannot delete organization '${orgId}' because it still contains ${appsCount} applications`,
      { details: { appsCount } }
    );
  }

  await client
    .withSession(async (sessionArg) => {
      await sessionArg.withTransaction(async (session) => {
        // Delete orgId in organisations collections
        await db
          .collection(COLL_ORGANIZATIONS)
          .deleteOne({ _id: orgId }, { session });

        // Delete orgId from user permissions
        await db
          .collection(COLL_USERS)
          .updateMany(
            {},
            { $pull: { 'perms.organizations': { _id: orgId } } },
            { session }
          );
      });
    })
    .finally(() => {
      client.close();
    });

  return { deletedResources: { organizationIds: [orgId] } };
};
