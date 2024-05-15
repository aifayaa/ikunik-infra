/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import syncCreateOrganizationBaserow from './syncCreateOrganizationBaserow';

const { COLL_ORGANIZATIONS, COLL_USERS } = mongoCollections;

export default async (userId, name, appleTeamId, appleCompanyName) => {
  const client = await MongoClient.connect();

  // Documentation, how to use transaction:
  // https://www.mongodb.com/docs/drivers/node/current/usage-examples/transaction-conv/#std-label-node-usage-convenient-txn
  // Return result of transaction by side effect
  let sessionRes;

  await client
    .withSession(async (sessionArg) => {
      await sessionArg.withTransaction(async (session) => {
        const newOrganization = {
          name,
          apple: {
            setupDone: false,
          },

          _id: new ObjectID().toString(),
          createdAt: new Date(),
          createdBy: userId,
        };

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
        await syncCreateOrganizationBaserow(userId, { orgId, name });

        sessionRes = newOrganization;
      });
    })
    .finally(() => {
      client.close();
    });

  return sessionRes;
};
