/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import getOrg from './getOrg';
import getOrgApps from './getOrgApps';

const { COLL_USERS, COLL_APPS } = mongoCollections;

export default async (userId, orgId, appId) => {
  const client = await MongoClient.connect();

  // Documentation, how to use transaction:
  // https://www.mongodb.com/docs/drivers/node/current/usage-examples/transaction-conv/#std-label-node-usage-convenient-txn
  // Return result of transaction by side effect
  let sessionRes;

  await client
    .withSession(async (sessionArg) => {
      await sessionArg.withTransaction(async (session) => {
        const db = client.db();
        // 1. Delete application from the user.perms.apps
        await db
          .collection(COLL_USERS)
          .updateOne(
            { _id: userId },
            { $pull: { 'perms.organizations': { _id: orgId } } },
            { session }
          );

        // 2. Add user in the app.organization
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

        const org = await getOrg(orgId);
        const apps = await getOrgApps(orgId);
        sessionRes = { ...org, apps };
      });
    })
    .finally(() => {
      client.close();
    });

  return sessionRes;
};
