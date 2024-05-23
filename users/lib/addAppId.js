/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  try {
    const { value } = await client
      .db()
      .collection(mongoCollections.COLL_USERS)
      .updateOne({ _id: userId }, { $addToSet: { appId } });
    return value;
  } finally {
    client.close();
  }
};
