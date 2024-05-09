/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS } = mongoCollections;

export default async (orgId, name) => {
  const client = await MongoClient.connect();

  try {
    await client
      .db()
      .collection(COLL_ORGANIZATIONS)
      .update({ _id: orgId }, { $set: { name } });

    return await client
      .db()
      .collection(COLL_ORGANIZATIONS)
      .findOne({ _id: orgId });
  } finally {
    client.close();
  }
};
