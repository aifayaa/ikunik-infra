/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS, COLL_USERS } = mongoCollections;

export default async (userId) => {
  const client = await MongoClient.connect();

  try {
    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId });

    const isSuperAdmin = user.superAdmin;
    let orgs;

    if (!isSuperAdmin) {
      const orgIds = user.perms.orgs.map((org) => org._id);
      orgs = await client
        .db()
        .collection(COLL_ORGANIZATIONS)
        .find({ _id: { $in: orgIds } })
        .toArray();
    } else {
      orgs = await client
        .db()
        .collection(COLL_ORGANIZATIONS)
        .find({})
        .toArray();
    }

    return orgs;
  } finally {
    client.close();
  }
};
