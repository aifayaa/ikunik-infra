/* eslint-disable import/no-relative-packages */
import get from 'lodash/get';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { hashPassword, checkPassword } from './password';
import { sendEmailTemplate } from '../../libs/email/sendEmail';
import { formatMessage, intlInit } from '../../libs/intl/intl';

const { COLL_USERS } = mongoCollections;

export const changePassword = async (
  userId,
  oldPassword,
  password,
  appId,
  lang
) => {
  const client = await MongoClient.connect();

  try {
    const usersCollection = client.db().collection(COLL_USERS);
    const user = await usersCollection.findOne(
      {
        _id: userId,
        appId,
      },
      {
        projection: {
          _id: true,
          emails: true,
          'services.password.bcrypt': true,
          'profile.username': true,
        },
      }
    );

    // The user need to be created with an email address
    // (Facebook users don't have one, for example)
    if (!get(user, 'emails[0].address')) throw new Error('user_not_found');
    if (!get(user, 'services.password.bcrypt'))
      throw new Error('user_not_found');

    // throw error if check fail
    await checkPassword(user, oldPassword, { mongoClient: client });

    const hashed = await hashPassword(password);

    usersCollection.updateOne(
      {
        _id: user._id,
        appId,
      },
      {
        $set: {
          'services.resume.loginTokens': [],
          'services.password.bcrypt': hashed,
        },
      }
    );

    const email = get(user, 'emails[0].address');

    intlInit(lang);

    /* send confirmation by email to user */
    const subject = formatMessage('auth:password_changed_email.title');
    const html = formatMessage('auth:password_changed_email.html', {
      username: user.profile.username,
      email,
    });

    await sendEmailTemplate(lang, 'customers', email, subject, html);
  } finally {
    client.close();
  }
};
