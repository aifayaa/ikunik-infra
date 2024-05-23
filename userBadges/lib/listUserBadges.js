/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_BADGES } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();

  try {
    const userBadges = await client
      .db()
      .collection(COLL_USER_BADGES)
      .find({
        appId,
      })
      .toArray();

    return userBadges;
  } finally {
    client.close();
  }
};
