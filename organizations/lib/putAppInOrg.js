/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import getOrg from './getOrg';
import getOrgApps from './getOrgApps';

const { COLL_USERS, COLL_APPS } = mongoCollections;

export default async (userId, orgId, appId, originDestination) => {
  const client = await MongoClient.connect();

  if (originDestination === 'fromUserToOrg') {
    // Documentation, how to use transaction:
    // https://www.mongodb.com/docs/drivers/node/current/usage-examples/transaction-conv/#std-label-node-usage-convenient-txn
    await client
      .withSession(async (sessionArg) => {
        await sessionArg.withTransaction(async (session) => {
          const db = client.db();
          // 1. Delete application from the user.perms.apps
          await db
            .collection(COLL_USERS)
            .updateOne(
              { _id: userId },
              { $pull: { 'perms.apps': { _id: appId } } },
              { session }
            );

          // 2. Add the application to thedestination organization
          //    and set the current user as 'admin'
          await db.collection(COLL_APPS).updateOne(
            { _id: appId },
            {
              $set: {
                organization: {
                  _id: orgId,
                  users: [{ id_: userId, roles: ['admin'] }],
                },
              },
            },
            { session }
          );
        });
      })
      .finally(() => {
        client.close();
      });
  }

  if (originDestination === 'fromOrgToOrg') {
    // Documentation, how to use transaction:
    // https://www.mongodb.com/docs/drivers/node/current/usage-examples/transaction-conv/#std-label-node-usage-convenient-txn
    await client
      .withSession(async (sessionArg) => {
        await sessionArg.withTransaction(async (session) => {
          const db = client.db();
          // 1. Delete the current relationship between the application and its organization
          await db.collection(COLL_APPS).updateOne(
            { _id: appId },
            {
              $unset: {
                organization: '',
              },
            },
            { session }
          );

          // 2. Add the application to thedestination organization
          //    and set the current user as 'admin'
          await db.collection(COLL_APPS).updateOne(
            { _id: appId },
            {
              $set: {
                organization: {
                  _id: orgId,
                  users: [{ id_: userId, roles: ['admin'] }],
                },
              },
            },
            { session }
          );
        });
      })
      .finally(() => {
        client.close();
      });
  }

  const org = await getOrg(orgId);
  const apps = await getOrgApps(orgId);
  return { ...org, apps };
};
