/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS } = mongoCollections;

export default async (userId) => {
  const client = await MongoClient.connect();

  try {
    const orgs = await client
      .db()
      .collection(COLL_ORGANIZATIONS)
      .find({ createdBy: userId });
    if (!orgs) {
      throw new Error('no_org_for_user');
    }
    return orgs;
  } finally {
    client.close();
  }
};
