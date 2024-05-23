/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export default async (orgId) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    return await db
      .collection(COLL_USERS)
      .find({ 'perms.organizations._id': orgId })
      .toArray();
  } finally {
    client.close();
  }
};
