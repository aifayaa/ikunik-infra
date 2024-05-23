/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_TOS } = mongoCollections;

export default async (appId, tosId) => {
  const client = await MongoClient.connect();
  try {
    const { ok } = await client
      .db()
      .collection(COLL_TOS)
      .deleteOne({ _id: tosId, appId });

    return ok;
  } finally {
    client.close();
  }
};
