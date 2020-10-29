// based on meteor accounts-password module
// createUser method from
// https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js

import MongoClient from '../../libs/mongoClient';
import { checkPassword } from './password';
import hashLoginToken from './hashLoginToken';
import Random from '../../libs/account_utils/random';

const { DB_NAME, COLL_USERS, COLL_APPS } = process.env;

export const login = async (rawEmail, username, password, appId) => {
  const email = rawEmail.toLowerCase();
  const client = await MongoClient.connect();

  try {
    const usersCollection = client.db(DB_NAME).collection(COLL_USERS);
    const appsCollection = client.db(DB_NAME).collection(COLL_APPS);
    const app = await appsCollection.findOne({ _id: appId }, { projection: { _id: true } });
    if (!app) throw new Error('app_not_found');

    const selector = { appId };
    if (email) {
      selector['emails.address'] = email;
    } else {
      selector.username = username;
    }
    const user = await usersCollection.findOne(selector);
    if (!user) {
      throw new Error('user_not_found');
    }

    if (
      !user.services ||
      !user.services.password ||
      !user.services.password.bcrypt
    ) {
      throw new Error('User has no password set"');
    }

    // throw error if check fail
    await checkPassword(user, password, { mongoClient: client });

    const token = Random.secret();

    await usersCollection.updateOne(
      {
        _id: user._id,
        appId,
      },
      {
        $addToSet: {
          'services.resume.loginTokens': {
            hashedToken: hashLoginToken(token),
            when: new Date(),
          },
        },
      },
    );

    return {
      userId: user._id,
      authToken: token,
    };
  } finally {
    client.close();
  }
};
