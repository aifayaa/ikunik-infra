/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (appId, update) => {
  const client = await MongoClient.connect();
  try {
    const db = client.db();
    const app = await db.collection(COLL_APPS).findOne({ _id: appId });

    // An application can be updated only if it is not in an organization
    if (app.organization) {
      throw new Error('forbidden');
    }

    // Update the application name
    const { name } = update;
    const commandRes = await db
      .collection(COLL_APPS)
      .findOneAndUpdate({ _id: appId }, { $set: { name } });

    const { ok, value: appUpdated } = commandRes;

    if (ok !== 1) {
      throw new Error('update_failed');
    }

    return appUpdated;
  } finally {
    client.close();
  }
};
