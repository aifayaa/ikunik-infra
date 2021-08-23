import MongoClient from '../../libs/mongoClient';

const {
  ADMIN_APP,
  COLL_APPS,
  COLL_PERM_GROUPS,
  COLL_USERS,
} = process.env;

export default async (
  appId,
  {
    groups = ['admins', 'moderators', 'crowd_managers'],
  } = {},
) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const app = await db.collection(COLL_APPS).findOne({ _id: appId });

    if (!app) {
      throw new Error('app_not_found');
    }

    const [permGroupsResults] = await Promise.all([
      Promise.all(groups.map((group) => (
        db.collection(COLL_PERM_GROUPS).findOne({
          appId,
          name: { $regex: new RegExp(`.*_${group}$`) },
        })
      ))),
    ]);

    const permGroupIds = permGroupsResults.filter((pg) => (pg)).map((result) => (result._id));
    if (permGroupIds.length === 0) {
      throw new Error('app_configuration_error');
    }

    const userQuery = {
      appId: ADMIN_APP,
      permGroupIds: { $in: permGroupIds },
    };
    const userProjection = {
      'emails.address': 1,
      'profile.firstname': 1,
      'profile.lastname': 1,
    };
    const users = await db.collection(COLL_USERS).find(
      userQuery,
      { projection: userProjection },
    ).toArray();

    return (users.map((user) => ({
      _id: user._id,
      email: user.emails[0].address,
      firstname: user.profile.firstname,
      lastname: user.profile.lastname,
    })));
  } finally {
    client.close();
  }
};
