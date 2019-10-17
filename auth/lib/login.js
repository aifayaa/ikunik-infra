// based on meteor accounts-password module
// createUser method from
// https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js

import { MongoClient } from 'mongodb';
import { checkPassword } from './password';
import hashLoginToken from './hashLoginToken';
import Random from './random';

const { DB_NAME, COLL_USERS, COLL_APPS } = process.env;

export const login = async (email, username, password, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
  });

  try {
    const usersCollection = client.db(DB_NAME).collection(COLL_USERS);
    const appsCollection = client.db(DB_NAME).collection(COLL_APPS);
    const app = await appsCollection.findOne({ _id: appId }, { projection: { _id: true } });
    if (!app) throw new Error('app_not_found');

    let user;
    if (email) {
      user = await usersCollection.findOne({ 'emails.address': email });
    } else {
      user = await usersCollection.findOne({ username });
    }
    if (!user) {
      throw new Error('user_not_found');
    }

    if (
      !user.services ||
      !user.services.password ||
      !(user.services.password.bcrypt || user.services.password.srp)
    ) {
      throw new Error('User has no password set"');
    }

    // throw error if check fail
    await checkPassword(
      user,
      password,
      { mongoClient: client },
    );

    const token = Random.secret();

    usersCollection.updateOne({
      _id: user._id,
      appIds: { $elemMatch: { $eq: appId } },
    }, {
      $addToSet: {
        'services.resume.loginTokens': {
          hashedToken: hashLoginToken(token),
          when: new Date(),
        },
      },
    });

    return {
      userId: user._id,
      tokenAuth: token,
    };
  } finally {
    client.close();
  }
};
