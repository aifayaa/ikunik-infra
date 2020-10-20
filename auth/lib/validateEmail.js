// based on meteor accounts-password module
// createUser method from
// https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js

import MongoClient from '../../libs/mongoClient';
import { hashPassword } from './password';
import Random from '../../libs/account_utils/random';
import checkForCaseInsensitiveUserDuplicates from './checkForCaseInsensitiveUserDuplicates';

const { DB_NAME, COLL_USERS, COLL_APPS } = process.env;

export const register = async (email, token, appId) => {
  const client = await MongoClient.connect();

  try {
    const usersCollection = client.db(DB_NAME).collection(COLL_USERS);
    const appsCollection = client.db(DB_NAME).collection(COLL_APPS);
    const app = await appsCollection.findOne({ _id: appId }, { projection: { _id: true } });
    if (!app) throw new Error('app_not_found');

    const user = await usersCollection.findOne({
      appIds: { $elemMatch: { $eq: appId } },
      'emails.address': email,
    }).project({
      'email.$': 1,
    });
    
    if (!user) {
      throw new Error('user_not_found');
    }
    else if (user.emails[0].verified) {
      throw new Error('email_already_verified');
    }
    else if (user.emails[0].token !== token) {
      throw new Error('invalid_email_token');
    }

    await usersCollection.updateOne({
      _id: user._id,
      'emails.address': email,
    }, {
      $set: {
        'emails.$.verified': true,
      },
    });
  } finally {
    client.close();
  }
};
