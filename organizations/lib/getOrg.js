/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS } = mongoCollections;

export default async (orgId) => {
  const client = await MongoClient.connect();

  try {
    const org = await client
      .db()
      .collection(COLL_ORGANIZATIONS)
      .findOne({ _id: orgId });

    return org;
  } finally {
    client.close();
  }
};
