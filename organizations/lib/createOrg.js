/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS, COLL_USERS } = mongoCollections;

export default async (userId, data) => {
  const client = await MongoClient.connect();

  try {
    console.log('ENTER try');
    // Documentation, how to use transaction:
    // https://www.mongodb.com/docs/drivers/node/current/usage-examples/transaction-conv/#std-label-node-usage-convenient-txn
    const sessionRes = await client.withSession(async (session) => {
      console.log('ENTER withSession');
      const transactionRes = await session.withTransaction(
        async (sessionArg) => {
          console.log('ENTER withTransaction');
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

          console.log('newOrganization', newOrganization);
          return newOrganization;
        }
      );

      console.log('transactionRes', transactionRes);
      return transactionRes;
    });

    console.log('sessionRes', sessionRes);
    return sessionRes;
  } finally {
    console.log('client.close()');
    client.close();
  }
};
