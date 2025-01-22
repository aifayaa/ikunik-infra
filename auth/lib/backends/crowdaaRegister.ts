/* eslint-disable import/no-relative-packages */
import MongoClient from '../../../libs/mongoClient';
import Random from '../../../libs/account_utils/random';
import mongoCollections from '../../../libs/mongoCollections.json';
import checkForCaseInsensitiveUserDuplicates from '../checkForCaseInsensitiveUserDuplicates';
import { hashPassword } from '../password';
import { AppType } from '../../../apps/lib/appEntity';
import { UTMType } from '../../../users/lib/userEntity';

const { COLL_USERS, COLL_USER_BADGES } = mongoCollections;

export const crowdaaRegister = async (
  username: string,
  rawEmail: string,
  password: string,
  app: AppType,
  profile = {},
  utm?: UTMType
) => {
  const client = await MongoClient.connect();
  const { _id: appId } = app;
  const email = rawEmail.toLowerCase();

  try {
    const usersCollection = client.db().collection(COLL_USERS);
    const badgesCollection = client.db().collection(COLL_USER_BADGES);
    const hashed = await hashPassword(password);
    let userId;

    const existingUser =
      email &&
      (await usersCollection.findOne(
        {
          appId,
          'emails.address': email,
          services: { $exists: true },
          'services.password': { $exists: false },
        },
        {
          projection: {
            'emails.$': 1,
            'services.password': 1,
            _id: 1,
            appId: 1,
          },
        }
      ));

    if (existingUser) {
      userId = existingUser._id;

      await usersCollection.updateOne(
        {
          _id: existingUser._id,
        },
        {
          $set: {
            'services.password': {
              bcrypt: hashed,
            },
          },
        }
      );
    } else {
      userId = Random.id();

      const badges = (
        await badgesCollection.find({ appId, isDefault: true }).toArray()
      ).map((badge: { _id: string }) => ({
        id: badge._id,
        status: 'assigned',
      }));

      const extra = utm ? { utm } : {};
      const newUser = {
        ...{
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
            ...profile,
            username,
            email,
          },
          badges,
        },
        ...extra,
      };

      // Perform a case insensitive check before insert
      await checkForCaseInsensitiveUserDuplicates(
        appId,
        'username',
        'Username',
        username,
        {
          errorMessage: 'username_already_exists',
          mongoClient: client,
        }
      );
      await checkForCaseInsensitiveUserDuplicates(
        appId,
        'emails.address',
        'Email',
        email,
        {
          errorMessage: 'email_already_exists',
          mongoClient: client,
        }
      );
      await usersCollection.insertOne(newUser);

      // Perform another check after insert, in case a matching user has been
      // inserted in the meantime
      try {
        await checkForCaseInsensitiveUserDuplicates(
          appId,
          'username',
          'Username',
          username,
          {
            errorMessage: 'username_already_exists',
            mongoClient: client,
            ownUserId: userId,
          }
        );
        await checkForCaseInsensitiveUserDuplicates(
          appId,
          'emails.address',
          'Email',
          email,
          {
            errorMessage: 'email_already_exists',
            mongoClient: client,
            ownUserId: userId,
          }
        );
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
