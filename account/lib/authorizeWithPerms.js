import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  ADMIN_APP,
} = process.env;

const {
  COLL_USERS,
  COLL_PERM_GROUPS,
} = mongoCollections;

export default async (hashedToken, appId) => {
  const client = await MongoClient.connect();

  try {
    const usersCollection = client
      .db()
      .collection(COLL_USERS);

    const conds = {
      $or: [
        { 'services.resume.loginTokens.hashedToken': hashedToken },
        { 'services.apiTokens.hashedToken': hashedToken },
      ],
    };

    if (appId) {
      conds.appId = { $in: [appId, ADMIN_APP] };
    }

    const user = await usersCollection
      .findOne(
        conds,
        { projection: {
          _id: 1,
          permGroupIds: 1,
          'services.resume.loginTokens': 1,
        } },
      );

    let loginToken = null;
    if (
      user &&
      user.services &&
      user.services.resume &&
      user.services.resume.loginTokens
    ) {
      /** We have to do this since mongo < 4.4 does not support positional projection
       * with a condition inside an `$or`, and `$elemMatch` isn't supported either */
      const dbToken = user.services.resume.loginTokens.reduce((acc, tok) => {
        if (tok.hashedToken === hashedToken) {
          return (tok);
        }
        return (acc);
      }, null);
      loginToken = dbToken;

      if (dbToken && dbToken.backend === 'wordpress') {
        if (dbToken.expiresAt <= Date.now()) {
          await usersCollection.updateOne(
            { _id: user._id },
            {
              $pull: {
                'services.resume.loginTokens': dbToken,
              },
            },
          );

          return ({
            id: null,
            loginToken: null,
            perms: {},
          });
        }
      }
    }

    /* if no appId, we cant determine user perms */
    if (!appId) {
      return {
        id: user && user._id,
        loginToken,
        perms: {},
      };
    }

    /* get user perms */
    const permGroupIds = (user && user.permGroupIds) || [];
    const permsAll = permGroupIds.length ? await client
      .db()
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
      loginToken,
      perms,
    };
  } finally {
    client.close();
  }
};
