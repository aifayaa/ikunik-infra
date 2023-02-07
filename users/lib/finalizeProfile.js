import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS, COLL_USERS, COLL_USER_BADGES } = mongoCollections;

async function getUserAndApp(userId, appId, { db }) {
  const user = await db.collection(COLL_USERS).findOne({ _id: userId, appId });

  if (!user) {
    throw new Error('user_not_found');
  }

  const app = await db.collection(COLL_APPS).findOne({ _id: appId });

  if (
    !app ||
    !app.settings ||
    !app.settings.public ||
    !app.settings.public.requiresUserInput
  ) {
    throw new Error('app_not_found');
  }

  return ({ app, user });
}

export async function finalizeProfile(userId, appId, newProfileFields) {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const { user, app } = await getUserAndApp(userId, appId, { db });
    const { profile: requiredProfileFields } = app.settings.public.requiresUserInput;

    if (!user.profile) {
      user.profile = {};
    }

    requiredProfileFields.forEach(({ field, optionnal }) => {
      if (!optionnal && !newProfileFields[field]) {
        throw new Error('mal_formed_request');
      }

      user.profile[field] = newProfileFields[field];
    });

    await db.collection(COLL_USERS).updateOne({ _id: userId, appId }, { $set: {
      profile: user.profile,
    } });

    return (true);
  } finally {
    client.close();
  }
}

export async function finalizeBadge(userId, appId, badge) {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const { user, app } = await getUserAndApp(userId, appId, { db });
    const { badges: requiredBadges } = app.settings.public.requiresUserInput;

    const appBadges = await db.collection(COLL_USER_BADGES).find({ appId, management: { $in: ['request', 'public'] } }).toArray();
    const appBadgesIds = appBadges.map(({ _id }) => (_id));

    if (!user.badges) {
      user.badges = [];
    }

    if (appBadgesIds.indexOf(badge) < 0 || requiredBadges.indexOf(badge) < 0) {
      throw new Error('mal_formed_request');
    }

    user.badges.push({
      id: badge,
    });

    await db.collection(COLL_USERS).updateOne({ _id: userId, appId }, { $set: {
      badges: user.badges,
    } });

    return (true);
  } finally {
    client.close();
  }
}
