/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS, COLL_USERS } = mongoCollections;

const defaultPermsOrgs = [];

const defaultPerms = {
  apps: [],
  websites: [],
  orgs: defaultPermsOrgs,
};

export default async (userId) => {
  const client = await MongoClient.connect();

  try {
    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId });

    // Sanity checks: if field is missing
    // -> set it to its default value
    if (user.perms === undefined) {
      await client
        .db()
        .collection(COLL_USERS)
        .updateOne({ _id: userId }, { $set: { perms: defaultPerms } });
      return [];
    }

    if (user.perms.orgs === undefined) {
      await client
        .db()
        .collection(COLL_USERS)
        .updateOne(
          { _id: userId },
          { $set: { 'perms.orgs': defaultPermsOrgs } }
        );
      return [];
    }

    // If the user is super admin, return all available organisations
    const isSuperAdmin = user.superAdmin;
    if (isSuperAdmin) {
      return await client
        .db()
        .collection(COLL_ORGANIZATIONS)
        .find({})
        .toArray();
    }

    // Else, return the organisation the user belongs to
    const orgIds = user.perms.orgs.map((org) => org._id);
    return await client
      .db()
      .collection(COLL_ORGANIZATIONS)
      .find({ _id: { $in: orgIds } })
      .toArray();
  } finally {
    client.close();
  }
};
