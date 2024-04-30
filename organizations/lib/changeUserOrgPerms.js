/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export default async (userId, orgId, data) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const result = await db
      .collection(COLL_USERS)
      .updateOne(
        { _id: userId, 'perms.organizations._id': orgId },
        { $set: { 'perms.organizations.$.roles': data.roles } }
      );

    if (result.modifiedCount === 0) {
      throw new Error('update_failed');
    }

    return await db
      .collection(COLL_USERS)
      .findOne({ _id: userId, 'perms.organizations._id': orgId });
  } finally {
    client.close();
  }
};
