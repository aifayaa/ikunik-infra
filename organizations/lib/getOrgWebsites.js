/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_WEBSITES } = mongoCollections;

export default async (orgId) => {
  const client = await MongoClient.connect();

  try {
    const websites = await client
      .db()
      .collection(COLL_WEBSITES)
      .find({ orgId }, { projection: { _id: 1, name: 1 } })
      .toArray();

    return websites;
  } finally {
    client.close();
  }
};
