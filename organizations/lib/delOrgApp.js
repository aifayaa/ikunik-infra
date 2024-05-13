/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import getOrg from './getOrg';
import getOrgApps from './getOrgApps';

const { COLL_USERS, COLL_APPS } = mongoCollections;

export default async (orgId, appId, newOwner) => {
  const client = await MongoClient.connect();

  // Documentation, how to use transaction:
  // https://www.mongodb.com/docs/drivers/node/current/usage-examples/transaction-conv/#std-label-node-usage-convenient-txn
  await client
    .withSession(async (sessionArg) => {
      await sessionArg.withTransaction(async (session) => {
        const db = client.db();
        // 1. Add application in the user.perms.apps
        await db
          .collection(COLL_USERS)
          .updateOne(
            { _id: newOwner },
            { $push: { 'perms.apps': { _id: appId, roles: ['owner'] } } },
            { session }
          );

        // 2. Delete the field app.organization
        await db
          .collection(COLL_APPS)
          .updateOne(
            { _id: appId },
            { $unset: { organization: '' } },
            { session }
          );
      });
    })
    .finally(() => {
      client.close();
    });

  const org = await getOrg(orgId);
  const apps = await getOrgApps(orgId);
  return { ...org, apps };
};
