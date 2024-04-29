/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS } = mongoCollections;

export default async (orgId, update) => {
  const client = await MongoClient.connect();

  try {
    const commandRes = await client
      .db()
      .collection(COLL_ORGANIZATIONS)
      .update({ _id: orgId }, { $set: update });

    const {
      result: { ok },
    } = commandRes;

    if (!ok) {
      throw new Error('update_failed');
    }

    return await client
      .db()
      .collection(COLL_ORGANIZATIONS)
      .findOne({ _id: orgId });
  } finally {
    client.close();
  }
};
