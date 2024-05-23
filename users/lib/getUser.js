/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import getProfile from './getProfile';

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  try {
    const profile = await getProfile(userId, appId);
    const user = await client
      .db()
      .collection(mongoCollections.COLL_USERS)
      .findOne({ _id: userId });
    if (profile) {
      user.hasArtistProfile = true;
    }
    return user;
  } finally {
    client.close();
  }
};
