/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export default async (orgId) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    return await db
      .collection(COLL_USERS)
      .find(
        { 'perms.organizations._id': orgId },
        {
          projection: {
            _id: 1,
            createdAt: 1,
            profile: 1,
            perms: 1,
          },
        }
      )
      .toArray();
  } finally {
    client.close();
  }
};
