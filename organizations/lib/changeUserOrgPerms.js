/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export default async (userId, orgId, data) => {
  const client = await MongoClient.connect();

  try {
    const authPerms = ['admin', 'member'];

    if (!authPerms.includes(data.newPerm)) {
      return { userPermUpdated: false };
    }

    const db = client.db();

    const userOrgPerm = await db
      .collection(COLL_USERS)
      .findOne({ _id: userId, 'perms.orgs._id': orgId });

    if (!userOrgPerm) {
      return { userPermUpdated: false };
    }

    const result = await db
      .collection(COLL_USERS)
      .updateOne(
        { _id: userId, 'perms.orgs._id': orgId },
        { $set: { 'perms.orgs.$.roles': data.newPerm } }
      );

    if (result.modifiedCount === 0) {
      return { userPermUpdated: false };
    }

    return { userPermUpdated: true };
  } finally {
    client.close();
  }
};
