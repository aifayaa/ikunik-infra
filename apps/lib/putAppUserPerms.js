/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { indexObjectArrayWithKey } from '../../libs/utils';

const { COLL_APPS } = mongoCollections;

export default async (appId, update) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const app = await db.collection(COLL_APPS).findOne({ _id: appId });

    const appsOrganizationUsers = indexObjectArrayWithKey(
      app.organization.users
    );

    const { roles, userId: targetUserId } = update;

    if (appsOrganizationUsers[targetUserId]) {
      throw new Error('user_already_exists');
    }

    const commandRes = await db
      .collection(COLL_APPS)
      .findOneAndUpdate(
        { _id: appId },
        { $push: { 'organization.users': { _id: targetUserId, roles } } }
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
