/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { syncUserBadges } from '../../libs/wordpress/wordpressApiSync';
import { intlInit, formatMessage } from '../../libs/intl/intl';
import { sendEmailTemplate } from '../../libs/email/sendEmail';

const { COLL_APPS, COLL_USERS, COLL_USER_BADGES } = mongoCollections;

export async function notifyUserOfRequestResults(
  userId,
  appId,
  lang,
  badgeId,
  adminDecision
) {
  const client = await MongoClient.connect();
  const db = client.db();

  const app = await db.collection(COLL_APPS).findOne({ _id: appId });
  const user = await db.collection(COLL_USERS).findOne({ _id: userId, appId });
  const badge = await db
    .collection(COLL_USER_BADGES)
    .findOne({ _id: badgeId, appId });
  const userEmail = user.profile.email || user.emails[0].address;

  intlInit(lang);

  const body = formatMessage(`userBadges:badge_request_${adminDecision}.html`, {
    appName: app.name,
    badgeName: badge.name,
    username: user.profile.username,
  });
  const subject = formatMessage(
    `userBadges:badge_request_${adminDecision}.title`,
    {
      appName: app.name,
      badgeName: badge.name,
    }
  );

  try {
    await sendEmailTemplate(lang, 'customers', userEmail, subject, body);
  } catch (e) {
    // Best effort
    // eslint-disable-next-line no-console
    console.error(e);
  }
}

export default async (
  userBadgeId,
  appId,
  { action = 'add', userId, adminUserId, lang }
) => {
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });

    if (!app) {
      throw new Error('app_not_found');
    }

    if (action === 'add') {
      const userBadgeObj = await client
        .db()
        .collection(COLL_USER_BADGES)
        .findOne({
          _id: userBadgeId,
          appId,
        });

      if (!userBadgeObj) {
        throw new Error('content_not_found');
      }

      await client
        .db()
        .collection(COLL_USERS)
        .updateOne(
          { _id: userId, appId },
          {
            $addToSet: {
              badges: {
                id: userBadgeObj._id,
                status: 'assigned',
                addedAt: new Date(),
                addedBy: adminUserId,
              },
            },
          }
        );
    } else if (action === 'remove') {
      await client
        .db()
        .collection(COLL_USERS)
        .updateOne(
          { _id: userId, appId },
          {
            $pull: {
              badges: {
                id: userBadgeId,
              },
            },
          }
        );
    } else if (action === 'validate') {
      await client
        .db()
        .collection(COLL_USERS)
        .updateOne(
          { _id: userId, appId, 'badges.id': userBadgeId },
          {
            $set: {
              'badges.$.status': 'validated',
              'badges.$.validatedAt': new Date(),
              'badges.$.validatedBy': adminUserId,
            },
          }
        );
      await notifyUserOfRequestResults(
        userId,
        appId,
        lang,
        userBadgeId,
        'validated'
      );
    } else if (action === 'reject') {
      await client
        .db()
        .collection(COLL_USERS)
        .updateOne(
          { _id: userId, appId, 'badges.id': userBadgeId },
          {
            $set: {
              'badges.$.status': 'rejected',
              'badges.$.rejectedAt': new Date(),
              'badges.$.rejectedBy': adminUserId,
            },
          }
        );
      await notifyUserOfRequestResults(
        userId,
        appId,
        lang,
        userBadgeId,
        'rejected'
      );
    } else {
      return { success: false };
    }

    if (app.backend && app.backend.type === 'wordpress') {
      const user = await client
        .db()
        .collection(COLL_USERS)
        .findOne({ _id: userId, appId });

      await syncUserBadges(user);
    }

    return { success: true };
  } finally {
    client.close();
  }
};
