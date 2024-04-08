/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (orgId) => {
  const client = await MongoClient.connect();

  try {
    const apps = await client
      .db()
      .collection(COLL_APPS)
      .find({ orgId }, { projection: { _id: 1, name: 1 } })
      .toArray();

    return apps;
  } finally {
    client.close();
  }
};
