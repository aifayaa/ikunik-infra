/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { indexObjectArrayWithKey, objGet } from '../../libs/utils';

const { ADMIN_APP } = process.env;

const { COLL_APPS, COLL_PERM_GROUPS, COLL_USERS } = mongoCollections;

export default async (
  appId,
  adminId,
  { groups = ['admins', 'moderators', 'crowd_managers'] } = {}
) => {
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

    const [permGroupsResults] = await Promise.all([
      Promise.all(
        groups.map((group) =>
          db.collection(COLL_PERM_GROUPS).findOne({
            appId,
            name: { $regex: new RegExp(`.*_${group}$`) },
          })
        )
      ),
    ]);

    const permGroupIds = permGroupsResults
      .filter((pg) => pg)
      .map((result) => ObjectID(result._id));
    if (permGroupIds.length > 0) {
      await db.collection(COLL_USERS).updateOne(
        { _id: adminId },
        {
          $pull: {
            permGroupIds: { $in: permGroupIds },
          },
        }
      );
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
