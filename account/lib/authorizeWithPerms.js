
import { MongoClient } from 'mongodb';

export default async (hashedToken, appId) => {
  const {
    DB_NAME,
    COLL_USERS,
    COLL_PERM_GROUPS,
    MONGO_URL,
  } = process.env;

  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });

  try {
    const user = await client.db(DB_NAME).collection(COLL_USERS).findOne(
      {
        $or: [
          { 'services.resume.loginTokens': { $elemMatch: { hashedToken } } },
          { 'services.apiTokens': { $elemMatch: { hashedToken } } },
        ],
      },
      { projection: { _id: 1, permGroupIds: 1 } },
    );

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
