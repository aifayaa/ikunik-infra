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
  await client
    .withSession(async (sessionArg) => {
      await sessionArg.withTransaction(async (session) => {
        /* TODO Vérifier les droits existants sur une autre org ou l'app serait présente, droits sur l'org, etc. et ne faire le transfert que si tout est ok (admin des deux côtés). Ne pas déplacer l'app si elle est déjà buildée/setup (pas avant Vivatech en tout cas please, les gars). En gros, check tout'! */
        const db = client.db();
        // 1. Delete application from the user.perms.apps
        await db
          .collection(COLL_USERS)
          .updateOne(
            { _id: userId },
            { $pull: { 'perms.apps': { _id: appId } } },
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
      });
    })
    .finally(() => {
      client.close();
    });

  const org = await getOrg(orgId);
  const apps = await getOrgApps(orgId);
  return { ...org, apps };
};
