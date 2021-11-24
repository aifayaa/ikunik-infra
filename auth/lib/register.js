// based on meteor accounts-password module
// createUser method from
// https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js

import MongoClient from '../../libs/mongoClient';
import { hashPassword } from './password';
import Random from '../../libs/account_utils/random';
import checkForCaseInsensitiveUserDuplicates from './checkForCaseInsensitiveUserDuplicates';
import { wordpressRegister } from './backends/wordpressRegister';

const {
  ADMIN_APP,
  DB_NAME,
  COLL_USERS,
  COLL_APPS,
} = process.env;

export const register = async (
  rawEmail,
  username,
  password,
  appId,
  { firstname, lastname } = {},
) => {
  const email = rawEmail.toLowerCase();
  const client = await MongoClient.connect();

  try {
    const usersCollection = client.db(DB_NAME).collection(COLL_USERS);
    const appsCollection = client.db(DB_NAME).collection(COLL_APPS);

    const app = await appsCollection.findOne(
      { _id: appId },
      { projection: { _id: true, backend: true } },
    );
    if (!app) throw new Error('app_not_found');

    if (appId !== ADMIN_APP && app.backend) {
      switch (app.backend.type) {
        case 'wordpress':
          return (wordpressRegister(username, rawEmail, password, app));
        default:
          throw new Error('unknown_backend');
      }
    }

    const hashed = await hashPassword(password);
    let userId;

    const existingUser = email && await usersCollection.findOne({
      appId,
      'emails.address': email,
      services: { $exists: true },
      'services.password': { $exists: false },
    }, { projection: {
      'emails.$': 1,
      'services.password': 1,
      _id: 1,
      appId: 1,
    } });

    if (existingUser) {
      userId = existingUser._id;

      await usersCollection.updateOne({
        _id: existingUser._id,
      }, {
        $set: {
          'services.password': {
            bcrypt: hashed,
          },
        },
      });
    } else {
      userId = Random.id();

      const newUser = {
        _id: userId,
        createdAt: new Date(),
        username,
        emails: [{ address: email }],
        services: {
          password: {
            bcrypt: hashed,
          },
        },
        appId,
        profile: {
          firstname,
          lastname,
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
      await usersCollection.insertOne(newUser);

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
    }

    /*
     * 20211123 : Removed email validation process since it was never used, and currently
     *            serves no purpose. It shall be used later though
     * if (!verified) {
     *   intlInit(lang);

     *   // send email verification link to user
     *   const subject = formatMessage('auth:address_confirmation_email.title');
     *   const url = `${REACT_APP_AUTH_URL}/validateEmail?token=${encodeURIComponent(token)}&
     *   appid=${encodeURIComponent(appId)}&email=${encodeURIComponent(email)}`;
     *   const html = formatMessage('auth:address_confirmation_email.html', { username, url });

     *   try {
     *     await sendEmailTemplate(lang, 'customers', email, subject, html);
     *   } catch (e) {
     *     await usersCollection.deleteOne({ _id: userId });
     *     throw new Error('cannot_send_email');
     *   }
     * }
     */

    return { userId };
  } finally {
    client.close();
  }
};
