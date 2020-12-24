import MongoClient from '../../libs/mongoClient';

const {
  ADMIN_APP,
  DB_NAME,
  COLL_USERS,
  COLL_PERM_GROUPS,
} = process.env;

export default async (hashedToken, appId) => {
  const client = await MongoClient.connect();

  try {
    const conds = {
      $or: [
        { 'services.resume.loginTokens': { $elemMatch: { hashedToken } } },
        { 'services.apiTokens': { $elemMatch: { hashedToken } } },
      ],
    };

    if (appId) {
      conds.appId = { $in: [appId, ADMIN_APP] };
    }

    const user = await client
      .db(DB_NAME)
      .collection(COLL_USERS)
      .findOne(
        conds,
        { projection: { _id: 1, permGroupIds: 1 } },
      );

    /* if no appId, we cant determine user perms */
    if (!appId) {
      return {
        id: user && user._id,
        perms: {},
      };
    }

    /* get user perms */
    const permGroupIds = (user && user.permGroupIds) || [];
    const permsAll = permGroupIds.length ? await client
      .db(DB_NAME)
      .collection(COLL_PERM_GROUPS)
      .find({
        _id: { $in: permGroupIds },
        appId,
      }).toArray()
      : [];

    const perms = permsAll.reduce((acc, curr) => {
      Object.keys(curr.perms).forEach((key) => {
        if (!acc[key]) {
          acc[key] = curr.perms[key];
        }
      });
      return acc;
    }, {});

    return {
      id: user && user._id,
      perms,
    };
  } finally {
    client.close();
  }
};
