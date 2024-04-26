/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS, COLL_USERS } = mongoCollections;

export default async (userId, data) => {
  const client = await MongoClient.connect();

  const session = client.startSession();

  try {
    const newOrganization = {
      ...data,

      _id: new ObjectID().toString(),
      createdAt: new Date(),
      createdBy: userId,
    };

    await session.withTransaction(async () => {
      const db = client.db();

      await db.collection(COLL_ORGANIZATIONS).insertOne(newOrganization);

      await db.collection(COLL_USERS).updateOne(
        { _id: userId },
        {
          $push: {
            'perms.organizations': {
              _id: newOrganization._id,
              roles: ['owner'],
            },
          },
        }
      );
    });

    return newOrganization;
  } finally {
    client.close();
  }
};
