// based on meteor accounts-password module
// createUser method from
// https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js

import MongoClient from '../../libs/mongoClient';
import { hashPassword } from './password';
import Random from '../../libs/account_utils/random';
import checkForCaseInsensitiveUserDuplicates from './checkForCaseInsensitiveUserDuplicates';
import { sendEmailTemplate } from '../../libs/email/sendEmail';
import { formatMessage, intlInit } from '../../libs/intl/intl';

const { DB_NAME, COLL_USERS, COLL_APPS, REACT_APP_AUTH_URL } = process.env;

export const register = async (rawEmail, username, password, lang, appId) => {
  const email = rawEmail.toLowerCase();
  const client = await MongoClient.connect();

  try {
    const usersCollection = client.db(DB_NAME).collection(COLL_USERS);
    const appsCollection = client.db(DB_NAME).collection(COLL_APPS);
    const app = await appsCollection.findOne({ _id: appId }, { projection: { _id: true } });
    if (!app) throw new Error('app_not_found');

    const hashed = await hashPassword(password);
    const token = Random.id();
    const newUser = {
      _id: Random.id(),
      createdAt: new Date(),
      username,
      emails: [{ address: email, verified: false, token }],
      services: {
        password: {
          bcrypt: hashed,
        },
      },
      appIds: [appId],
      profile: {
        username,
      },
    };

    // Perform a case insensitive check before insert
    await checkForCaseInsensitiveUserDuplicates(appId, 'username', 'Username', username, {
      errorMessage: 'username_already_exists',
      mongoClient: client,
    });
    await checkForCaseInsensitiveUserDuplicates(appId, 'emails.address', 'Email', email, {
      errorMessage: 'email_already_exists',
      mongoClient: client,
    });
    const { insertedId: userId } = await usersCollection.insertOne(newUser);

    // Perform another check after insert, in case a matching user has been
    // inserted in the meantime
    try {
      await checkForCaseInsensitiveUserDuplicates(appId, 'username', 'Username', username, {
        errorMessage: 'username_already_exists',
        mongoClient: client,
        ownUserId: userId,
      });
      await checkForCaseInsensitiveUserDuplicates(appId, 'emails.address', 'Email', email, {
        errorMessage: 'email_already_exists',
        mongoClient: client,
        ownUserId: userId,
      });
    } catch (ex) {
      // Delete inserted user if the check fails
      await usersCollection.deleteOne({ _id: userId });
      throw ex;
    }

    intlInit(lang);

    /* send email verification link to user */
    const subject = formatMessage('auth:address_confirmation_email_title');
    const url = `${REACT_APP_AUTH_URL}/validateEmail?token=${encodeURIComponent(token)}&appid=${encodeURIComponent(appId)}&email=${encodeURIComponent(email)}`;
    const html = formatMessage('auth:address_confirmation_email_html', { username, url });

    try {
      await sendEmailTemplate(lang, 'customers', email, subject, html);
    } catch (e) {
      await usersCollection.deleteOne({ _id: userId });
      throw new Error('cannot_send_email');
    }

    return { userId };
  } finally {
    client.close();
  }
};
