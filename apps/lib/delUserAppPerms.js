/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export default async (userId, appId) => {
  const client = await MongoClient.connect();

  try {
    const result = await client
      .db()
      .collection(COLL_USERS)
      .updateOne({ _id: userId }, { $pull: { 'perms.apps': { _id: appId } } });

    if (result.modifiedCount === 0) {
      return { userUpdated: false };
    }

    return { userUpdated: true };
  } finally {
    client.close();
  }
};
