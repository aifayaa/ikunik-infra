/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { indexObjectArrayWithKey } from '../../libs/utils';
import { getApplicationUsers } from './appsUtils';

const { ADMIN_APP } = process.env;

const { COLL_APPS, COLL_USERS } = mongoCollections;

type GetAppAdminsArgsType = {
  userProjection?: object | null;
  includeSuperAdmins?: boolean;
};

export default async (
  appId: string,
  {
    userProjection = {
      _id: 1,
      'emails.address': 1,
      'profile.firstname': 1,
      'profile.lastname': 1,
    },
    includeSuperAdmins = false,
  }: GetAppAdminsArgsType = {}
) => {
  const client = await MongoClient.connect();

  const queryOpts = userProjection ? { projection: userProjection } : {};

  try {
    const db = client.db();

    const app = await db.collection(COLL_APPS).findOne({ _id: appId });

    if (!app) {
      throw new Error('app_not_found');
    }

    const admins = {};

    if (app.organization) {
      const appOrgAdmins = await db
        .collection(COLL_USERS)
        .find(
          {
            appId: ADMIN_APP,
            'perms.orgs': {
              $elemMatch: {
                _id: app.organization._id,
                roles: { $in: ['admin', 'owner'] },
              },
            },
          },
          queryOpts
        )
        .toArray();
      if (appOrgAdmins.length > 0) {
        indexObjectArrayWithKey(appOrgAdmins, '_id', admins);
      }

      const appOrgUsersIds = await getApplicationUsers(app, false);

      if (appOrgUsersIds.length > 0) {
        const appOrgUsers = await db
          .collection(COLL_USERS)
          .find(
            {
              _id: { $in: appOrgUsersIds.map(({ _id }) => _id) },
              appId: ADMIN_APP,
              'perms.orgs._id': app.organization._id,
            },
            queryOpts
          )
          .toArray();
        if (appOrgUsers.length > 0) {
          indexObjectArrayWithKey(appOrgUsers, '_id', admins);
        }
      }
    }

    const directAdminsList = await db
      .collection(COLL_USERS)
      .find({ appId: ADMIN_APP, 'perms.apps._id': app._id }, queryOpts)
      .toArray();

    if (directAdminsList.length > 0) {
      indexObjectArrayWithKey(directAdminsList, '_id', admins);
    }

    if (includeSuperAdmins) {
      const superAdminsList = await db
        .collection(COLL_USERS)
        .find({ appId: ADMIN_APP, superAdmin: true }, queryOpts)
        .toArray();

      if (superAdminsList.length > 0) {
        indexObjectArrayWithKey(superAdminsList, '_id', admins);
      }
    }

    return Object.values(admins);
  } finally {
    client.close();
  }
};
