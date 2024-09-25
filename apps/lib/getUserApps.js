/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils';
import { appPrivateFieldsProjection } from './appsUtils.ts';

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

    const orgsMembersIds = objGet(user, ['perms', 'organizations'], [])
      .map(({ _id, roles }) => {
        const isMember =
          roles.indexOf('owner') < 0 &&
          roles.indexOf('admin') < 0 &&
          roles.indexOf('member') >= 0;
        if (isMember) return _id;
        return null;
      })
      .filter((x) => x);

    const orgsAdminsIds = objGet(user, ['perms', 'organizations'], [])
      .map(({ _id, roles }) => {
        const isMember =
          roles.indexOf('owner') >= 0 || roles.indexOf('admin') >= 0;
        if (isMember) return _id;
        return null;
      })
      .filter((x) => x);

    if (
      appsIds.length === 0 &&
      orgsMembersIds.length === 0 &&
      orgsAdminsIds.length === 0
    ) {
      return [];
    }

    const getAppsWhere = (where) =>
      db
        .collection(COLL_APPS)
        .find(where, { projection: appPrivateFieldsProjection })
        .toArray();

    const appsFromId =
      appsIds.length > 0 ? await getAppsWhere({ _id: { $in: appsIds } }) : [];

    const appsFromOrgsWhere = {
      _id: { $nin: appsIds },
    };

    if (orgsAdminsIds.length > 0 && orgsMembersIds.length > 0) {
      appsFromOrgsWhere.$or = [
        { 'organization._id': { $in: orgsAdminsIds } },
        {
          'organization._id': { $in: orgsMembersIds },
          'organization.users._id': userId,
        },
      ];
    } else if (orgsAdminsIds.length > 0) {
      appsFromOrgsWhere['organization._id'] = { $in: orgsAdminsIds };
    } else if (orgsMembersIds.length > 0) {
      appsFromOrgsWhere['organization._id'] = { $in: orgsMembersIds };
      appsFromOrgsWhere['organization.users._id'] = userId;
    }

    const appsFromOrgs =
      orgsAdminsIds.length > 0 || orgsMembersIds.length > 0
        ? await getAppsWhere(appsFromOrgsWhere)
        : [];
    const apps = appsFromId.concat(appsFromOrgs).sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt - a.createdAt;
      } else if (b.createdAt) {
        return 1;
      } else if (a.createdAt) {
        return -1;
      } else if (a.name > b.name) {
        return 1;
      } else if (a.name < b.name) {
        return -1;
      }

      return 0;
    });

    return apps;
  } finally {
    client.close();
  }
};
