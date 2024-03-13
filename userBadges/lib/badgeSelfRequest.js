/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { intlInit, formatMessage } from '../../libs/intl/intl';
import { sendEmailTemplate } from '../../libs/email/sendEmail';
import getAppAdmins from '../../apps/lib/getAppAdmins';
import { objGet } from '../../libs/utils';

const { ADMIN_APP } = process.env;

const { COLL_APPS, COLL_USERS, COLL_USER_BADGES } = mongoCollections;

const { REACT_APP_PRESS_SERVICE_URL, REACT_APP_CROWD_SERVICE_URL } =
  process.env;

async function notifyAdminsForBadgeRequest(
  user,
  badge,
  { appId, lang, client }
) {
  intlInit(lang);
  const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });

  const body = formatMessage('userBadges:user_badge_request.html', {
    badgeName: badge.name,
    badgeUrl: `${REACT_APP_PRESS_SERVICE_URL}/${app._id}/userBadges/edit/${badge._id}`,
    userEmail: user.profile.email || user.emails[0].address,
    userId: user._id,
    username: user.profile.username,
    usersUrl: `${REACT_APP_CROWD_SERVICE_URL}/${app._id}/users`,
  });
  const subject = formatMessage('userBadges:user_badge_request.title', {
    appName: app.name,
    badgeName: badge.name,
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

export default async (appId, userId, userBadgeId, { lang }) => {
  const client = await MongoClient.connect();

  try {
    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId, appId });
    const userBadges = user.badges || [];

    const badge = await client
      .db()
      .collection(COLL_USER_BADGES)
      .findOne({ _id: userBadgeId, appId });

    if (!badge) {
      throw new Error('content_not_found');
    }

    if (badge.management !== 'request') {
      throw new Error('wrong_argument_value');
    }

    const userBadgesHash = userBadges.reduce((acc, itm) => {
      acc[itm.id] = true;
      return acc;
    }, {});

    if (!userBadgesHash[userBadgeId]) {
      const actions = {};

      if (!user.badges) {
        actions.$set = {
          badges: [
            { id: userBadgeId, status: 'requested', requestedAt: new Date() },
          ],
        };
      } else {
        actions.$addToSet = {
          badges: {
            id: userBadgeId,
            status: 'requested',
            requestedAt: new Date(),
          },
        };
      }

      await client
        .db()
        .collection(COLL_USERS)
        .updateOne({ _id: userId, appId }, actions);
      await notifyAdminsForBadgeRequest(user, badge, { appId, lang, client });
    }
  } finally {
    client.close();
  }
};
