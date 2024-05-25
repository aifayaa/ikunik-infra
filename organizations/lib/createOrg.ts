/* eslint-disable import/no-relative-packages */
import Stripe from 'stripe';

import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import syncCreateOrganizationBaserow from './syncCreateOrganizationBaserow';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_SETUP,
  MISSING_ENVIRONMENT_VARIABLE_CODE,
} from '../../libs/httpResponses/errorCodes';

const { STRIPE_SECRET_KEY } = process.env;

const { COLL_ORGANIZATIONS, COLL_USERS } = mongoCollections;

type OrganizationType = {
  _id: string;
  name: string;
  email: string;
  apple: {
    setupDone: boolean;
    teamId?: string;
    teamStatus?: string;
    companyName?: string;
  };
  createdAt: Date;
  createdBy: string;
  stripeCustomerId: string;
};

export default async (
  userId: string,
  name: string,
  email: string,
  appleTeamId: string,
  appleCompanyName: string
) => {
  let stripeCustomerId: string | undefined;

  const stripe = (() => {
    if (STRIPE_SECRET_KEY === undefined) {
      throw new CrowdaaError(
        ERROR_TYPE_SETUP,
        MISSING_ENVIRONMENT_VARIABLE_CODE,
        `Missing environment variable STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}`,
        { httpCode: 500 }
      );
    }

    return new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
      typescript: true,
    });
  })();

  try {
    const client = await MongoClient.connect();
    // const client = await MongoClient.connect(MONGO_URL!, DEFAULT_OPTS);
    // const client = await MongoClient.connect(MONGO_URL!);

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

            stripeCustomerId = customer.id;

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
    // If something wrong happen and the Stripe customer_id has been created,
    // -> delete it
    if (stripeCustomerId) {
      await stripe.customers.del(stripeCustomerId);
    }

    throw exception;
  }
};
