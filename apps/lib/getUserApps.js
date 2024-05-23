/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils';
import { appPrivateFieldsProjection } from './appsUtils';

const { COLL_APPS, COLL_USERS } = mongoCollections;

const APPS_SORT = [
  ['createdAt', -1],
  ['name', 1],
];

export default async (userId) => {
  const client = await MongoClient.connect();
  try {
    const db = client.db();
    const user = await db.collection(COLL_USERS).findOne({ _id: userId });

    if (user.superAdmin) {
      const allApps = await db
        .collection(COLL_APPS)
        .find({}, { projection: appPrivateFieldsProjection })
        .sort(APPS_SORT)
        .toArray();

      return allApps;
    }

    const appsIds = objGet(user, ['perms', 'apps'], []).map(({ _id }) => _id);
    const orgsIds = objGet(user, ['perms', 'organizations'], []).map(
      ({ _id }) => _id
    );

    const $or = [];
    if (appsIds.length > 0) {
      $or.push({ _id: { $in: appsIds } });
    }
    if (orgsIds.length > 0) {
      $or.push({ 'organization._id': { $in: orgsIds } });
    }

    if ($or.length === 0) return [];

    const apps = await db
      .collection(COLL_APPS)
      .find(
        {
          $or,
        },
        { projection: appPrivateFieldsProjection }
      )
      .sort(APPS_SORT)
      .toArray();

    return apps;
  } finally {
    client.close();
  }
};
