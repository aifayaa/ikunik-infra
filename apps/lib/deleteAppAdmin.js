/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import { indexObjectArrayWithKey, objGet } from '../../libs/utils';

const { ADMIN_APP } = process.env;

const { COLL_APPS, COLL_USERS } = mongoCollections;

export default async (appId, adminId) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const app = await db.collection(COLL_APPS).findOne({ _id: appId });
    const user = await db
      .collection(COLL_USERS)
      .findOne({ _id: adminId, appId: ADMIN_APP });

    if (!app) {
      throw new Error('app_not_found');
    }
    if (!user) {
      throw new Error('user_not_found');
    }

    const appsPerms = objGet(user, 'perms.apps');
    if (appsPerms) {
      const appsPermsHash = indexObjectArrayWithKey(appsPerms);
      if (appsPermsHash[appId]) {
        await db.collection(COLL_USERS).updateOne(
          { _id: adminId },
          {
            $pull: {
              'perms.apps': { _id: appId },
            },
          }
        );
      }
    }
  } finally {
    client.close();
  }

  return true;
};
