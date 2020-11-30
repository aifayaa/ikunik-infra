import get from 'lodash/get';
import MongoClient from '../../libs/mongoClient';
import { hashPassword } from './password';
import { sendEmailTemplate } from '../../libs/email/sendEmail';
import { formatMessage, intlInit } from '../../libs/intl/intl';

const {
  DB_NAME,
  COLL_USERS,
  COLL_APPS,
} = process.env;

export const resetPassword = async (rawEmail, appId, token, password, lang) => {
  const email = rawEmail.toLowerCase();
  const client = await MongoClient.connect();

  try {
    const usersCollection = client.db(DB_NAME).collection(COLL_USERS);
    const appsCollection = client.db(DB_NAME).collection(COLL_APPS);
    const [user, app] = await Promise.all([
      usersCollection.findOne(
        {
          'emails.address': email,
          appIds: appId,
        },
        {
          projection: { _id: true, emails: true, 'services.password.reset': true, 'profile.username': true },
        },
      ),
      appsCollection.findOne({ _id: appId }, { projection: { _id: true } }),
    ]);

    if (!app) throw new Error('app_not_found');
    if (!user) throw new Error('email_not_found');

    const resetToken = get(user, 'services.password.reset.token');
    const expiresAt = get(user, 'services.password.reset.expiresAt');

    if (!resetToken || resetToken !== token || new Date() > expiresAt) {
      throw new Error('token_expired');
    }

    const hashed = await hashPassword(password);
    /*
      invalidate login tokens on the user
      set new password
      set email as verified
      remove password.reset token
    */
    usersCollection.updateOne({
      _id: user._id,
      'emails.address': email,
    }, {
      $set: {
        'services.resume.loginTokens': [],
        'services.password.bcrypt': hashed,
        'emails.$.verified': true,
      },
      $unset: {
        'services.password.reset': 1,
        'services.password.srp': 1,
      },
    });

    intlInit(lang);

    /* send confirmation by email to user */
    const subject = formatMessage('auth:password_reset_email_title');
    const html = formatMessage('auth:password_reset_email_html', { username: user.profile.username, email });

    await sendEmailTemplate(lang, 'customers', email, subject, html);
  } finally {
    client.close();
  }
};
