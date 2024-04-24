/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export default async (userId, orgId) => {
  const client = await MongoClient.connect();

  try {
    const result = await client
      .db()
      .collection(COLL_USERS)
      .updateOne({ _id: userId }, { $pull: { 'perms.orgs': { _id: orgId } } });

    if (result.modifiedCount === 0) {
      return { permsFound: false };
    }

    return { userUpdated: true };
  } finally {
    client.close();
  }
};
