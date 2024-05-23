/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import deleteUser from '../../users/lib/deleteUser';

const { COLL_APPS, COLL_USERS } = mongoCollections;

export default async (appId, userId) => {
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId });
    if (!app) {
      throw new Error('app_not_found');
    }
    if (!user) {
      throw new Error('user_not_found');
    }

    await deleteUser(userId, appId);

    return true;
  } finally {
    client.close();
  }
};
