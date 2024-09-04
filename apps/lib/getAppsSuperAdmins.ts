/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { ADMIN_APP } = process.env;

const { COLL_USERS } = mongoCollections;

type GetAppsSuperAdminArgsType = {
  userProjection?: object | null;
};

export default async ({
  userProjection = {
    _id: 1,
    'emails.address': 1,
    'profile.firstname': 1,
    'profile.lastname': 1,
  },
}: GetAppsSuperAdminArgsType = {}) => {
  const client = await MongoClient.connect();

  const queryOpts = userProjection ? { projection: userProjection } : {};

  try {
    const db = client.db();

    const superAdminsList = await db
      .collection(COLL_USERS)
      .find({ appId: ADMIN_APP, superAdmin: true }, queryOpts)
      .toArray();

    return superAdminsList;
  } finally {
    client.close();
  }
};
