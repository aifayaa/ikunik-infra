/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (userId) => {
  const client = await MongoClient.connect();
  try {
    const apps = await client
      .db()
      .collection(COLL_APPS)
      .find({ owners: userId })
      .toArray();

    return apps;
  } finally {
    client.close();
  }
};
