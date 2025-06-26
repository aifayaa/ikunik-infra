/* eslint-disable import/no-relative-packages */
import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';
import hashLoginToken from '../hashLoginToken.ts';
import Random from '../../../libs/account_utils/random.ts';
import { WordpressAPI } from '../../../libs/backends/wordpress';
import { syncUserBadges } from '../../../libs/wordpress/wordpressApiSync';
import { hashPassword } from '../password.ts';

const {
  COLL_EXTERNAL_PURCHASES,
  COLL_PRESS_ARTICLES,
  COLL_USERS,
  COLL_USER_BADGES,
} = mongoCollections;

const listsContentEquals = (a, b) => {
  if (a.length !== b.length) return false;

  const hashedA = a.reduce((acc, val) => {
    acc[val] = true;
    return acc;
  }, {});

  return b.every((obj) => !!hashedA[obj]);
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
    return acc;
  }, {});
  const newIndexed = newIds.reduce((acc, itm) => {
    acc[itm] = true;
    return acc;
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
    await extPurchasesCollection.insertMany(
      toAdd.map((id) => ({
        appId,
        collection,
        itemId: id,
        source: 'wordpress',
        userId,
      }))
    );
  }
}

export async function setUserBadges(client, user, badgeIds) {
  const existingBadges = await client
    .db()
    .collection(COLL_USER_BADGES)
    .find({ _id: { $in: badgeIds } }, { projection: { _id: 1 } })
    .toArray();

  const existingBadgesIds = existingBadges.map(({ _id }) => _id);

  const userBadgesIds = (user.badges || []).map(({ id }) => id);

  if (!listsContentEquals(existingBadgesIds, userBadgesIds)) {
    const badges = existingBadges.map(({ _id }) => ({
      id: _id,
      status: 'assigned',
    }));
    await client
      .db()
      .collection(COLL_USERS)
      .updateOne({ _id: user._id }, { $set: { badges } });
  }
}

export async function setUserPermissions(client, user, permissions) {
  const extPurchasesCollection = client
    .db()
    .collection(COLL_EXTERNAL_PURCHASES);

  const ownedBadges = permissions.ownedBadges || [];
  const ownedArticles = permissions.ownedArticles || [];

  // Badges
  const userBadges = await extPurchasesCollection
    .find({
      appId: user.appId,
      source: 'wordpress',
      collection: COLL_USER_BADGES,
      userId: user._id,
    })
    .toArray();

  const userBadgesIds = userBadges.map(({ itemId }) => itemId);

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
  const purchases = await extPurchasesCollection
    .find({
      appId: user.appId,
      source: 'wordpress',
      collection: COLL_PRESS_ARTICLES,
      userId: user._id,
    })
    .toArray();

  const purchasesIds = purchases.map(({ itemId }) => itemId);

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

export const wordpressLogin = async (
  usernameOrEmail,
  password,
  app,
  fromRegister = false
) => {
  const client = await MongoClient.connect();
  const wpApi = new WordpressAPI(app);
  const appId = app._id;

  try {
    const usersCollection = client.db().collection(COLL_USERS);
    let reply;

    try {
      reply = await wpApi.call('POST', '/jwt-auth/v1/token', {
        username: usernameOrEmail,
        password,
      });
    } catch (e) {
      console.log('DEBUG wpLogin e', e, { usernameOrEmail, appId });
      if (!e.response) {
        throw new Error('backend_network_error');
      } else if (e.error && e.error.message) {
        reply = e.error;
      } else {
        throw new Error('backend_error');
      }
    }

    if (!reply) {
      console.log('DEBUG wpLogin noreply', { usernameOrEmail, appId });
      throw new Error('backend_error');
    }
    if (!reply.token) {
      console.log('DEBUG wpLogin reply', reply, { usernameOrEmail, appId });
      if (reply.code === 'jwt_auth_failed') {
        throw new Error('invalid_credentials');
      } else {
        throw new Error('backend_error');
      }
    }

    const {
      token: wpToken,
      user_id: wpUserId,
      user_email: rawUserEmail,
      user_nicename: userNicename,
      user_display_name: userDisplayName,
      autologin_token: autoLoginToken,
      permissions,
    } = reply;

    const userEmail = rawUserEmail.toLowerCase();

    const selector = {
      appId,
      $or: [{ 'profile.email': userEmail }, { 'emails.address': userEmail }],
    };
    let user = await usersCollection.findOne(selector);
    const token = Random.secret();
    let badges = null;
    if (fromRegister) {
      badges = (
        await client
          .db()
          .collection(COLL_USER_BADGES)
          .find({ appId, isDefault: true })
          .toArray()
      ).map((badge) => ({
        id: badge._id,
        status: 'assigned',
      }));
    }

    const loginToken = {
      hashedToken: hashLoginToken(token),
      when: new Date(),
      backend: 'wordpress',
      wpToken,
      expiresAt: Date.now() + 365 * 86400 * 1000,
    };
    const hashedPassword = await hashPassword(password);
    if (!user) {
      user = {
        _id: Random.id(),
        createdAt: new Date(),
        username: userDisplayName || userNicename || usernameOrEmail,
        services: {
          wordpress: {
            userEmail,
            userNicename,
            userDisplayName,
            userId: wpUserId,
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
          username: userDisplayName || userNicename || usernameOrEmail,
          email: userEmail,
        },
        emails: [
          {
            address: userEmail,
          },
        ],
      };

      if (autoLoginToken) {
        user.services.wordpress.autoLoginToken = autoLoginToken;
      }

      if (badges) user.badges = badges;

      await usersCollection.insertOne(user);
    } else {
      const update = {
        $set: {
          'profile.email': userEmail,
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
        if (!update.$unset) update.$unset = {};
        update.$unset['services.wordpress.autoLoginToken'] = '';
      }

      if (fromRegister && badges && badges.length > 0) {
        update.$addToSet.badges = badges;
        if (!user.badges) user.badges = [];
        badges.forEach((badge) => {
          const id = user.badges.findIndex((badge2) => badge2.id === badge.id);
          if (id < 0) {
            user.badges.push({
              id: badge.id,
              status: 'assigned',
            });
          }
        });
      }

      if (user.services && user.services.wordpress) {
        if (wpUserId && wpUserId !== user.services.wordpress.userId) {
          update.$set['services.wordpress.userId'] = wpUserId;
        }
      }

      await usersCollection.updateOne(
        {
          _id: user._id,
          appId,
        },
        update
      );
    }

    if (permissions) {
      await setUserPermissions(client, user, permissions);
    }

    if (fromRegister && badges && badges.length > 0) {
      await syncUserBadges(user);
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
