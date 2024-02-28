/* eslint-disable import/no-relative-packages */
import crypto from 'crypto';
import get from 'lodash/get';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendEmailTemplate } from '../../libs/email/sendEmail';
import { formatMessage, intlInit } from '../../libs/intl/intl';
import { wordpressForgotPassword } from './backends/wordpressForgotPassword';

const TOKEN_TIMEOUT = 3600000; // 1 hour in ms
const RETRY_TIMEOUT = 2 * 60000; // 2 min in ms

const { ADMIN_APP, REACT_APP_AUTH_URL } = process.env;

const { COLL_USERS, COLL_APPS } = mongoCollections;

export const forgotPassword = async (rawEmail, lang, appId) => {
  const email = rawEmail.toLowerCase();
  const client = await MongoClient.connect();
  try {
    const usersCollection = client.db().collection(COLL_USERS);
    const appsCollection = client.db().collection(COLL_APPS);
    const [user, app] = await Promise.all([
      usersCollection.findOne(
        {
          'emails.address': email,
          appId,
        },
        {
          projection: {
            _id: true,
            emails: true,
            'profile.username': true,
            'services.password.reset': true,
          },
        }
      ),
      appsCollection.findOne(
        { _id: appId },
        { projection: { _id: true, builds: true, name: true, backend: true } }
      ),
    ]);

    if (!app) throw new Error('app_not_found');

    if (appId !== ADMIN_APP && app.backend) {
      switch (app.backend.type) {
        case 'wordpress':
          await wordpressForgotPassword(email, app);
          return { backend: true };
        default:
          throw new Error('unknown_backend');
      }
    }

    if (!user) throw new Error('email_not_found');
    if (
      new Date() - get(user, 'services.password.reset.when', 0) <
      RETRY_TIMEOUT
    ) {
      throw new Error('token_already_sent');
    }

    /* Generate reset token */
    const token = crypto.randomBytes(3).toString('hex').toUpperCase();

    const when = new Date();
    const expiresAt = new Date(when.getTime() + TOKEN_TIMEOUT);
    const $set = {
      'services.password.reset': {
        token,
        email,
        when,
        expiresAt,
        reason: 'reset',
        appId,
      },
    };

    intlInit(lang);

    /* Prepare data for email */
    const subject = formatMessage('auth:forgot_password_email.title');
    const url = `${REACT_APP_AUTH_URL}/password-reset-landing?token=${encodeURIComponent(token)}&appid=${encodeURIComponent(appId)}&email=${encodeURIComponent(email)}`;

    /* store token into db */
    await usersCollection.updateOne({ _id: user._id }, { $set });

    /* send token by email to user */
    const html = formatMessage('auth:forgot_password_email.html', {
      username: user.profile.username,
      url,
      token,
    });

    try {
      await sendEmailTemplate(lang, 'customers', email, subject, html);
    } catch (e) {
      throw new Error('cannot_send_email');
    }

    return {};
  } finally {
    client.close();
  }
};
