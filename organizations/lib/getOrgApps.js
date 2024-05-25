/* eslint-disable import/no-relative-packages */
import { appPrivateFieldsProjection } from '../../apps/lib/appsUtils.ts';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (orgId) => {
  const client = await MongoClient.connect();

  try {
    const apps = await client
      .db()
      .collection(COLL_APPS)
      .find(
        { 'organization._id': orgId },
        {
          projection: appPrivateFieldsProjection,
        }
      )
      .toArray();

    return apps;
  } finally {
    client.close();
  }
};
