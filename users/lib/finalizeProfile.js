/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { intlInit, formatMessage } from '../../libs/intl/intl';
import { sendEmailTemplate } from '../../libs/email/sendEmail';
import getAppAdmins from '../../apps/lib/getAppAdmins.ts';
import { objGet } from '../../libs/utils';
import { syncUserBadges } from '../../libs/wordpress/wordpressApiSync';

const { ADMIN_APP } = process.env;

const { REACT_APP_CROWD_SERVICE_URL } = process.env;

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

  return { app, user };
}

export async function finalizeInternalProfile(userId, appId, newProfileFields) {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const { user, app } = await getUserAndApp(userId, appId, { db });
    const { internalProfileFields } = app.settings;

    if (!user.internalProfile) {
      user.internalProfile = {};
    }

    internalProfileFields.forEach(({ field, optionnal }) => {
      if (!optionnal && !newProfileFields[field]) {
        throw new Error('mal_formed_request');
      }

      user.internalProfile[field] = newProfileFields[field];
    });

    const $set = Object.keys(user.internalProfile).reduce((acc, key) => {
      acc[`internalProfile.${key}`] = user.internalProfile[key];
      return acc;
    }, {});

    await db.collection(COLL_USERS).updateOne({ _id: userId, appId }, { $set });

    return true;
  } finally {
    client.close();
  }
}

export async function finalizeProfile(userId, appId, newProfileFields) {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const { user, app } = await getUserAndApp(userId, appId, { db });
    const { profile: requiredProfileFields } =
      app.settings.public.requiresUserInput;

    if (!user.profile) {
      user.profile = {};
    }

    requiredProfileFields.forEach(({ field, optionnal }) => {
      if (!optionnal && !newProfileFields[field]) {
        throw new Error('mal_formed_request');
      }

      user.profile[field] = newProfileFields[field];
    });

    const $set = Object.keys(user.profile).reduce((acc, key) => {
      acc[`profile.${key}`] = user.profile[key];
      return acc;
    }, {});

    await db.collection(COLL_USERS).updateOne({ _id: userId, appId }, { $set });

    return true;
  } finally {
    client.close();
  }
}

export async function finalizeBadge(userId, appId, badgeId) {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const { user, app } = await getUserAndApp(userId, appId, { db });
    const { badges: requiredBadges } = app.settings.public.requiresUserInput;

    const appBadges = await db
      .collection(COLL_USER_BADGES)
      .find({ appId, management: { $in: ['request', 'public'] } })
      .toArray();
    const appBadgesHash = appBadges.reduce((acc, badge) => {
      acc[badge._id] = badge;
      return acc;
    }, {});

    if (!user.badges) {
      user.badges = [];
    }

    const badge = appBadgesHash[badgeId];
    if (!badge || requiredBadges.ids.indexOf(badgeId) < 0) {
      throw new Error('mal_formed_request');
    }

    const insBadge = {
      id: badgeId,
      status: 'assigned',
    };

    if (badge.management === 'request') {
      insBadge.status = 'requested';
      insBadge.requestedAt = new Date();
    }

    user.badges.push(insBadge);

    await db.collection(COLL_USERS).updateOne(
      { _id: userId, appId },
      {
        $set: {
          badges: user.badges,
        },
      }
    );

    if (app.backend && app.backend.type === 'wordpress') {
      await syncUserBadges(user);
    }

    return true;
  } finally {
    client.close();
  }
}

export async function finalizedUser(userId, appId, lang) {
  const client = await MongoClient.connect();
  const db = client.db();

  const app = await db.collection(COLL_APPS).findOne({ _id: appId });
  const user = await db.collection(COLL_USERS).findOne({ _id: userId, appId });

  intlInit(lang);

  const bodyParams = {
    appName: app.name,
    userEmail: user.profile.email || user.emails[0].address,
    userId: user._id,
    username: user.profile.username,
    usersUrl: `${REACT_APP_CROWD_SERVICE_URL}/${appId}/users`,
    extraFields: '',
  };

  if (
    app &&
    app.settings &&
    app.settings.public &&
    app.settings.public.requiresUserInput &&
    app.settings.public.requiresUserInput.profile
  ) {
    const { profile: requiredProfileFields } =
      app.settings.public.requiresUserInput;
    const extraFieldsArray = requiredProfileFields.map(({ field, name }) => {
      const value = user.profile[field];
      const encValue = formatMessage('general:var', { var: value });
      const encName = formatMessage('general:var', { var: name });
      return `<li>${encName} : <strong>${encValue}</strong></li>`;
    });
    bodyParams.extraFields = extraFieldsArray.join('\n');
  }

  const body = formatMessage('users:finalized_profile.html', bodyParams);
  const subject = formatMessage('users:finalized_profile.title', {
    appName: app.name,
    username: user.profile.username,
  });
  const superAdmins = await client
    .db()
    .collection(COLL_USERS)
    .find({ superAdmin: true, appId: ADMIN_APP }, { projection: { emails: 1 } })
    .toArray();

  const superAdminsEmails = superAdmins.map(({ emails }) => emails[0].address);
  const admins = await getAppAdmins(appId, {
    projection: { 'emails.address': 1 },
  });
  const emails = admins
    .map((admin) => objGet(admin, 'emails.0.address'))
    .filter((x) => x);
  superAdminsEmails.forEach((email) => {
    if (emails.indexOf(email) < 0) {
      emails.push(email);
    }
  });
  const promises = emails.map((email) => {
    /* in case of error, ignore it, just try with best effort */
    try {
      return sendEmailTemplate(lang, 'clients', email, subject, body);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return null;
    }
  });

  await Promise.allSettled(promises);
}
