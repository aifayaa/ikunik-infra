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
      .findOne({ _id: userId }, { projection: { superAdmin: 1, perms: 1 } });

    // If the user is super admin, return all available organisations
    const isSuperAdmin = user.superAdmin;
    if (isSuperAdmin) {
      return await client
        .db()
        .collection(COLL_ORGANIZATIONS)
        .find({})
        .toArray();
    }

    // If the user don't have permissions: no organisation
    if (user.perms === undefined || user.perms.organizations === undefined) {
      return [];
    }

    // Else, return the organisation the user belongs to
    const orgIds = user.perms.organizations.map((org) => org._id);
    return await client
      .db()
      .collection(COLL_ORGANIZATIONS)
      .find({ _id: { $in: orgIds } })
      .toArray();
  } finally {
    client.close();
  }
};
