/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import syncCreateOrganizationBaserow from './syncCreateOrganizationBaserow';
import { OrganizationType } from './organizationEntity';
import { getStripeClient } from '../../libs/stripe';

const { COLL_ORGANIZATIONS, COLL_USERS } = mongoCollections;

export default async (
  userId: string,
  name: string,
  email: string,
  appleTeamId: string,
  appleCompanyName: string
) => {
  const stripe = getStripeClient();

  const client = await MongoClient.connect();

  const organizationId = new ObjectID().toString();
  const organizationCreatedAt = new Date();
  const organizationCreatedBy = userId;

  const customer = await stripe.customers.create({
    name,
    email,
    metadata: {
      organizationId: organizationId,
      createdAt: organizationCreatedAt.toISOString(),
      createdBy: organizationCreatedBy,
    },
  });

  const stripeCustomerId = customer.id;

  try {
    // Documentation, how to use transaction:
    // https://www.mongodb.com/docs/drivers/node/current/usage-examples/transaction-conv/#std-label-node-usage-convenient-txn
    // Return result of transaction by side effect
    let sessionRes: OrganizationType | undefined;

    await client
      .withSession(
        async (sessionArg: {
          withTransaction: (session: unknown) => Promise<void>;
        }) => {
          await sessionArg.withTransaction(async (session: unknown) => {
            const newOrganization: OrganizationType = {
              _id: organizationId,
              name,
              email,
              apple: {
                setupDone: false,
              },
              createdAt: organizationCreatedAt,
              createdBy: organizationCreatedBy,
              stripeCustomerId,
            };

            if (appleTeamId) {
              newOrganization.apple.teamId = appleTeamId.toUpperCase();
              newOrganization.apple.teamStatus = 'checking';
            }
            if (appleCompanyName) {
              newOrganization.apple.companyName = appleCompanyName;
            }

            const db = await client.db();

            await db
              .collection(COLL_ORGANIZATIONS)
              .insertOne(newOrganization as any, { session });

            await db.collection(COLL_USERS).updateOne(
              { _id: userId },
              {
                $push: {
                  'perms.organizations': {
                    _id: newOrganization._id,
                    roles: ['owner'],
                  },
                },
              },
              { session }
            );

            const { _id: orgId } = newOrganization;
            await syncCreateOrganizationBaserow(userId, {
              orgId,
              name,
              stripeCustomerId,
            });

            sessionRes = newOrganization;
          });
        }
      )
      .finally(() => {
        client.close();
      });

    return sessionRes;
  } catch (exception) {
    // If something wrong happens during the organization creation: delete the linked Stripe account
    await stripe.customers.del(stripeCustomerId);

    throw exception;
  }
};
