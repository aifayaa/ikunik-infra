/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import syncCreateOrganizationBaserow from './syncCreateOrganizationBaserow';

const { COLL_ORGANIZATIONS, COLL_USERS } = mongoCollections;

export default async (userId, data) => {
  const client = await MongoClient.connect();

  // Documentation, how to use transaction:
  // https://www.mongodb.com/docs/drivers/node/current/usage-examples/transaction-conv/#std-label-node-usage-convenient-txn
  // Return result of transaction by side effect
  let sessionRes;

  await client
    .withSession(async (session) => {
      await session.withTransaction(async (sessionArg) => {
        const newOrganization = {
          ...data,

          _id: new ObjectID().toString(),
          createdAt: new Date(),
          createdBy: userId,
        };

        const db = client.db();

        await db
          .collection(COLL_ORGANIZATIONS)
          .insertOne(newOrganization, { sessionArg });

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
          { sessionArg }
        );

        const { _id: orgId, name } = newOrganization;
        await syncCreateOrganizationBaserow(userId, { orgId, name });

        sessionRes = newOrganization;
      });
    })
    .finally(() => {
      client.close();
    });

  return sessionRes;
};
