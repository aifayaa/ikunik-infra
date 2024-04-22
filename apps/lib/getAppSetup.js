/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });

    if (!app) {
      throw new Error('app_not_found');
    }

    const { status, statusChangedAt } = app.setup;

    return { status, statusChangedAt };
  } finally {
    client.close();
  }
};
