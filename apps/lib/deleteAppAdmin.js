import MongoClient, { ObjectID } from '../../libs/mongoClient';

const {
  ADMIN_APP,
  COLL_APPS,
  COLL_PERM_GROUPS,
  COLL_USERS,
} = process.env;

export default async (
  appId,
  adminId,
  {
    groups = ['admins', 'moderators', 'crowd_managers'],
  } = {},
) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const app = await db.collection(COLL_APPS).findOne({ _id: appId });
    const user = await db.collection(COLL_USERS).findOne({ _id: adminId, appId: ADMIN_APP });

    if (!app) {
      throw new Error('app_not_found');
    }
    if (!user) {
      throw new Error('user_not_found');
    }

    const [permGroupsResults] = await Promise.all([
      Promise.all(groups.map((group) => (
        db.collection(COLL_PERM_GROUPS).findOne({
          appId,
          name: { $regex: new RegExp(`.*_${group}$`) },
        })
      ))),
    ]);

    const permGroupIds = permGroupsResults
      .filter((pg) => (pg))
      .map((result) => (ObjectID(result._id)));
    if (permGroupIds.length === 0) {
      throw new Error('app_configuration_error');
    }

    await db.collection(COLL_USERS).updateOne(
      { _id: adminId },
      {
        $pull: {
          permGroupIds,
        },
      },
    );
  } finally {
    client.close();
  }
};
