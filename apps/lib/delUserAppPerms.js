/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (targetUserId, appId) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();
    const commandRes = await db
      .collection(COLL_APPS)
      .findOneAndUpdate(
        { _id: appId },
        { $pull: { 'organization.users': { _id: targetUserId } } }
      );

    const { ok, value: appUpdated } = commandRes;
    if (ok !== 1) {
      throw new Error('update_failed');
    }

    return appUpdated;
  } finally {
    client.close();
  }
};
