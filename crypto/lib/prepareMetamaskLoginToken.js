/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendEmailMailgunHtml } from '../../libs/email/sendEmailMailgun';
import { formatMessage, intlInit } from '../../libs/intl/intl';
import random from '../../libs/account_utils/random.ts';

const { COLL_APPS, COLL_USERS } = mongoCollections;

const { METAMASK_LOGIN_DOMAIN } = process.env;

export default async (appId, userId, lang) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const user = await db.collection(COLL_USERS).findOne({
      _id: userId,
      appId,
    });

    const app = await db.collection(COLL_APPS).findOne({
      _id: appId,
    });

    if (!user) {
      throw new Error('user_not_found');
    }

    if (!app) {
      throw new Error('app_not_found');
    }

    let loginToken = user.services && user.services.metamaskLoginToken;

    if (!loginToken) {
      loginToken = `${Date.now()}-${random.id(32)}`;
      await db.collection(COLL_USERS).updateOne(
        {
          _id: userId,
          appId,
        },
        { $set: { 'services.metamaskLoginToken': loginToken } }
      );
    }

    const userEmail =
      (user.emails && user.emails[0] && user.emails[0].address) ||
      user.profile.email;

    await intlInit(lang);

    const link = `https://${METAMASK_LOGIN_DOMAIN}/authenticate?userId=${encodeURIComponent(userId)}&appId=${encodeURIComponent(appId)}&token=${encodeURIComponent(loginToken)}`;
    const title = formatMessage('crypto:metamaskSendLoginUrl.title', {
      app,
      link,
    });
    const content = formatMessage('crypto:metamaskSendLoginUrl.html', {
      app,
      link,
    });
    const html = formatMessage('libsEmail:template_skeleton', {
      body: '$t(libsEmail:template_customers)',
      content,
    });

    await sendEmailMailgunHtml(
      'No reply <support@crowdaa.com>',
      userEmail,
      title,
      html
    );

    return { ok: true };
  } finally {
    client.close();
  }
};
