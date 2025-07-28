/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (userId) => {
  const client = await MongoClient.connect();
  try {
    const user = await client
      .db()
      .collection(mongoCollections.COLL_USERS)
      .findOne({ _id: userId });
    return user;
  } finally {
    client.close();
  }
};
