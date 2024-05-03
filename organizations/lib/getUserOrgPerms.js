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
      // TODO Filter output, return profile, this organization roles and _id
      .find({ 'perms.organizations._id': orgId })
      .toArray();
  } finally {
    client.close();
  }
};
