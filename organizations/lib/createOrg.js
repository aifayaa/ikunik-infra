/* eslint-disable import/no-relative-packages */
import Stripe from 'stripe';

import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import syncCreateOrganizationBaserow from './syncCreateOrganizationBaserow';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  ERROR_TYPE_SETUP,
  MISSING_ENVIRONMENT_VARIABLE_CODE,
} from '../../libs/httpResponses/errorCodes';

const { STRIPE_SECRET_KEY } = process.env;

const { COLL_ORGANIZATIONS, COLL_USERS } = mongoCollections;

export default async (userId, name, email, appleTeamId, appleCompanyName) => {
  const client = await MongoClient.connect();

  // Documentation, how to use transaction:
  // https://www.mongodb.com/docs/drivers/node/current/usage-examples/transaction-conv/#std-label-node-usage-convenient-txn
  // Return result of transaction by side effect
  let sessionRes;

  await client
    .withSession(async (sessionArg) => {
      await sessionArg.withTransaction(async (session) => {
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

        const newOrganization = {
          name,
          email,
          apple: {
            setupDone: false,
          },

          _id: new ObjectID().toString(),
          createdAt: new Date(),
          createdBy: userId,
        };

        const customer = await stripe.customers.create({
          name,
          email,
          metadata: {
            _id: new ObjectID().toString(),
            createdAt: newOrganization.createdAt,
            createdBy: newOrganization.createdBy,
          },
        });

        newOrganization.customer_id = customer.id;

        if (appleTeamId) {
          newOrganization.apple.teamId = appleTeamId;
          newOrganization.apple.teamStatus = 'checking';
        }
        if (appleCompanyName) {
          newOrganization.apple.companyName = appleCompanyName;
        }

        const db = client.db();

        await db
          .collection(COLL_ORGANIZATIONS)
          .insertOne(newOrganization, { session });

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
          customer_id: newOrganization.customer_id,
        });

        sessionRes = newOrganization;
      });
    })
    .finally(() => {
      client.close();
    });

  return sessionRes;
};
