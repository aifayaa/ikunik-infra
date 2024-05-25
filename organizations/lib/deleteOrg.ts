/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.js';
import {
  ERROR_TYPE_NOT_ALLOWED,
  ORGANISATION_STILL_CONTAINS_APPLICATION_CODE,
} from '../../libs/httpResponses/errorCodes.js';
import MongoClient from '../../libs/mongoClient.js';
import mongoCollections from '../../libs/mongoCollections.json';
import { getStripeClient } from '../../libs/stripe.js';
import { OrganizationType } from './organizationEntity.js';

const { COLL_ORGANIZATIONS, COLL_USERS, COLL_APPS } = mongoCollections;

export default async (orgId: string) => {
  const stripe = getStripeClient();

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

  // let stripeCustomerId: string | undefined;

  // If the organization is link to a Stripe account...
  const org: OrganizationType = await db
    .collection(COLL_ORGANIZATIONS)
    .findOne({ _id: orgId });

  const { stripeCustomerId } = org;

  await client
    .withSession(
      async (sessionArg: {
        withTransaction: (session: unknown) => Promise<void>;
      }) => {
        await sessionArg.withTransaction(async (session: unknown) => {
          // Delete orgId in organizations collections
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
      }
    )
    .finally(() => {
      client.close();
    });

  // ... Delete the Stripe account
  await stripe.customers.del(stripeCustomerId);

  return { deletedResources: { organizationIds: [orgId] } };
};
