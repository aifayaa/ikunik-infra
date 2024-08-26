/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import getOrg from './getOrg.js';
import getOrgApps from './getOrgApps';

const { COLL_USERS, COLL_APPS } = mongoCollections;

export async function putAppInOrgUserToOrg(
  userId: string,
  orgId: string,
  appId: string
) {
  const client = await MongoClient.connect();

  // Documentation, how to use transaction:
  // https://www.mongodb.com/docs/drivers/node/current/usage-examples/transaction-conv/#std-label-node-usage-convenient-txn
  await client
    .withSession(
      async (sessionArg: {
        withTransaction: (session: unknown) => Promise<void>;
      }) => {
        await sessionArg.withTransaction(async (session: unknown) => {
          const db = client.db();
          // 1. Delete application from the user.perms.apps
          await db
            .collection(COLL_USERS)
            .updateMany(
              {},
              { $pull: { 'perms.apps': { _id: appId } } },
              { session }
            );

          const org = await getOrg(orgId);
          // 2. Add the application to thedestination organization
          //    and set the current user as 'admin'
          const $set = {
            organization: {
              _id: orgId,
              users: [{ _id: userId, roles: ['admin'] }],
            },
          } as { organization: object; featurePlan?: object };

          if (org.defaultFeaturePlan) {
            $set.featurePlan = {
              ...org.defaultFeaturePlan,
              startedAt: new Date(),
            };
          }
          await db.collection(COLL_APPS).updateOne(
            { _id: appId },
            {
              $set,
            },
            { session }
          );
        });
      }
    )
    .finally(() => {
      client.close();
    });

  const org = await getOrg(orgId);
  const apps = await getOrgApps(orgId, userId);
  return { ...org, apps };
}

export async function putAppInOrgOrgToOrg(
  userId: string,
  orgId: string,
  appId: string,
  db: {
    collection: (collectionName: string) => {
      updateOne: (
        selector: Object,
        operator: Object,
        option?: Object
      ) => Promise<void>;
    };
  },
  session: unknown
) {
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

  const destOrg = await getOrg(orgId);
  // 2. Add the application to thedestination organization
  //    and set the current user as 'admin'
  const $set = {
    organization: {
      _id: orgId,
      users: [{ _id: userId, roles: ['admin'] }],
    },
  } as { organization: object; featurePlan?: object };

  if (destOrg.defaultFeaturePlan) {
    $set.featurePlan = {
      ...destOrg.defaultFeaturePlan,
      startedAt: new Date(),
    };
  }
  await db.collection(COLL_APPS).updateOne(
    { _id: appId },
    {
      $set,
    },
    { session }
  );

  const org = await getOrg(orgId);
  const apps = await getOrgApps(orgId, userId);
  return { ...org, apps };
}
