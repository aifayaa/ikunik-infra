import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';
import hashLoginToken from '../hashLoginToken';
import Random from '../../../libs/account_utils/random';
import { WordpressAPI } from '../../../libs/backends/wordpress';
import { hashPassword } from '../password';

const {
  COLL_EXTERNAL_PURCHASES,
  COLL_PRESS_ARTICLES,
  COLL_USERS,
  COLL_USER_BADGES,
} = mongoCollections;

const listsContentEquals = (a, b) => {
  if (a.length !== b.length) return (false);

  const hashedA = a.reduce((acc, val) => {
    acc[val] = true;
    return (acc);
  }, {});

  return (b.every((obj) => (!!hashedA[obj])));
};

async function managePermsDifferences({
  appId,
  collection,
  dbElements,
  extPurchasesCollection,
  newIds,
  userId,
}) {
  const toAdd = []; // IDs of articles
  const toRemove = []; // IDs of externalPurchases

  const oldIndexed = dbElements.reduce((acc, itm) => {
    acc[itm.itemId] = itm._id;
    return (acc);
  }, {});
  const newIndexed = newIds.reduce((acc, itm) => {
    acc[itm] = true;
    return (acc);
  }, {});

  Object.keys(oldIndexed).forEach((id) => {
    if (!newIndexed[id]) toRemove.push(oldIndexed[id]);
  });
  Object.keys(newIndexed).forEach((id) => {
    if (!oldIndexed[id]) toAdd.push(id);
  });

  if (toRemove.length > 0) {
    await extPurchasesCollection.deleteMany({
      _id: { $in: toRemove },
    });
  }

  if (toAdd.length > 0) {
    await extPurchasesCollection.insertMany(toAdd.map((id) => ({
      appId,
      collection,
      itemId: id,
      source: 'wordpress',
      userId,
    })));
  }
}

export async function setUserPermissions(client, user, permissions) {
  const extPurchasesCollection = client.db().collection(COLL_EXTERNAL_PURCHASES);

  const ownedBadges = permissions.ownedBadges || [];
  const ownedArticles = permissions.ownedArticles || [];

  // Badges
  const userBadges = await extPurchasesCollection.find({
    appId: user.appId,
    collection: COLL_USER_BADGES,
    source: 'wordpress',
    userId: user._id,
  }).toArray();

  const userBadgesIds = userBadges.map(({ itemId }) => (itemId));

  if (!listsContentEquals(userBadgesIds, ownedBadges)) {
    await managePermsDifferences({
      appId: user.appId,
      collection: COLL_USER_BADGES,
      dbElements: userBadges,
      extPurchasesCollection,
      newIds: ownedBadges,
      userId: user._id,
    });
  }

  // Articles
  const purchases = await extPurchasesCollection.find({
    appId: user.appId,
    source: 'wordpress',
    collection: COLL_PRESS_ARTICLES,
    userId: user._id,
  }).toArray();

  const purchasesIds = purchases.map(({ itemId }) => (itemId));

  if (!listsContentEquals(purchasesIds, ownedArticles)) {
    await managePermsDifferences({
      appId: user.appId,
      collection: COLL_PRESS_ARTICLES,
      dbElements: purchases,
      extPurchasesCollection,
      newIds: ownedArticles,
      userId: user._id,
    });
  }
}

export const wordpressLogin = async (username, password, app) => {
  const client = await MongoClient.connect();
  const wpApi = new WordpressAPI(app);
  const appId = app._id;

  try {
    const usersCollection = client.db().collection(COLL_USERS);
    let reply;

    try {
      reply = await wpApi.call('POST', '/jwt-auth/v1/token', {
        username,
        password,
      });
    } catch (e) {
      if (!e.response) {
        throw new Error('backend_network_error');
      } else if (e.error && e.error.message) {
        reply = e.error;
      } else {
        throw new Error('backend_error');
      }
    }

    if (!reply) {
      throw new Error('backend_error');
    }
    if (!reply.token) {
      if (reply.code === 'jwt_auth_failed') {
        throw new Error('invalid_credentials');
      } else {
        throw new Error('backend_error');
      }
    }

    const {
      token: wpToken,
      user_email: userEmail,
      user_nicename: userNicename,
      user_display_name: userDisplayName,
      autologin_token: autoLoginToken,
      permissions,
    } = reply;

    const selector = { appId, 'profile.email': userEmail };
    let user = await usersCollection.findOne(selector);
    const token = Random.secret();

    const loginToken = {
      hashedToken: hashLoginToken(token),
      when: new Date(),
      backend: 'wordpress',
      wpToken,
      expiresAt: Date.now() + 7 * 86400 * 1000,
    };
    const hashedPassword = await hashPassword(password);
    if (!user) {
      user = {
        _id: Random.id(),
        createdAt: new Date(),
        username: userDisplayName || userNicename || username,
        services: {
          wordpress: {
            userEmail,
            userNicename,
            userDisplayName,
          },
          resume: {
            loginTokens: [loginToken],
          },
          password: {
            bcrypt: hashedPassword,
          },
        },
        appId,
        profile: {
          username: userDisplayName || userNicename || username,
          email: userEmail,
        },
        emails: [{
          address: userEmail,
        }],
      };

      if (autoLoginToken) {
        user.services.wordpress.autoLoginToken = autoLoginToken;
      }

      await usersCollection.insertOne(user);
    } else {
      const update = {
        $set: {
          'services.wordpress.userEmail': userEmail,
          'services.wordpress.userNicename': userNicename,
          'services.wordpress.userDisplayName': userDisplayName,
          'services.password': {
            bcrypt: hashedPassword,
          },
        },
        $addToSet: {
          'services.resume.loginTokens': loginToken,
        },
      };
      if (autoLoginToken) {
        update.$set['services.wordpress.autoLoginToken'] = autoLoginToken;
      } else if (
        user.services &&
        user.services.wordpress &&
        user.services.wordpress.autoLoginToken
      ) {
        update.$unset['services.wordpress.autoLoginToken'] = '';
      }

      await usersCollection.updateOne(
        {
          _id: user._id,
          appId,
        },
        update,
      );
    }

    if (permissions) {
      await setUserPermissions(client, user, permissions);
    }

    return {
      userId: user._id,
      authToken: token,
      autoLoginToken,
    };
  } finally {
    client.close();
  }
};
