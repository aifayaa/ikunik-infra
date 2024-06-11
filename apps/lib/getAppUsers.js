/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { getApp, getApplicationUsers } from './appsUtils.ts';

const { COLL_USERS } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const app = await getApp(appId);
    const appUsersId = getApplicationUsers(app).map((user) => user._id);

    const users = await db
      .collection(COLL_USERS)
      .find({
        _id: { $in: appUsersId },
      })
      .toArray();

    return users;
  } finally {
    client.close();
  }
};
