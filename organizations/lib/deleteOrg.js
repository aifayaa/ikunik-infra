/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS, COLL_USERS } = mongoCollections;

export default async (userId, orgId) => {
  const client = await MongoClient.connect();

  // TODO: prevent deletion of organization if there is applications in it
  await client
    .withSession(async (sessionArg) => {
      await sessionArg.withTransaction(async (session) => {
        const db = client.db();

        // Delete orgId in organisations collections
        await db
          .collection(COLL_ORGANIZATIONS)
          .deleteOne({ _id: orgId }, { session });

        // Delete orgId from user permissions
        await db
          .collection(COLL_USERS)
          .updateOne(
            { _id: userId },
            { $pull: { 'perms.organizations': { _id: orgId } } },
            { session }
          );
      });
    })
    .finally(() => {
      client.close();
    });
};
