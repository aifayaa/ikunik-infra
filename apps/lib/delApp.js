/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS, COLL_USERS } = mongoCollections;

export default async (userId, appId) => {
  const client = await MongoClient.connect();

  try {
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

          // 2. Delete the application document from DB
          await db.collection(COLL_APPS).deleteOne({ _id: appId }, { session });
        });
      })
      .finally(() => {
        client.close();
      });

    return { deletedResources: { applicationIds: [appId] } };
  } finally {
    client.close();
  }
};
