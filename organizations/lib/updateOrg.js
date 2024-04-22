/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS } = mongoCollections;

export default async (orgId, update) => {
  const client = await MongoClient.connect();

  try {
    const { modifiedCount } = await client
      .db()
      .collection(COLL_ORGANIZATIONS)
      .updateOne({ _id: orgId }, { $set: update });

    return modifiedCount;
  } finally {
    client.close();
  }
};
