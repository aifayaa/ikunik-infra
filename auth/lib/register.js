// based on meteor accounts-password module
// createUser method from
// https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js

import MongoClient from '../../libs/mongoClient';
import { hashPassword } from './password';
import Random from '../../libs/account_utils/random';
import checkForCaseInsensitiveUserDuplicates from './checkForCaseInsensitiveUserDuplicates';

const { DB_NAME, COLL_USERS, COLL_APPS } = process.env;

export const register = async (email, username, password, appId) => {
  const client = await MongoClient.connect();

  try {
    const usersCollection = client.db(DB_NAME).collection(COLL_USERS);
    const appsCollection = client.db(DB_NAME).collection(COLL_APPS);
    const app = await appsCollection.findOne({ _id: appId }, { projection: { _id: true } });
    if (!app) throw new Error('app_not_found');

    const hashed = await hashPassword(password);
    const newUser = {
      _id: Random.id(),
      createdAt: new Date(),
      username,
      emails: [{ address: email, verified: false }],
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
      mongoClient: client,
    });
    await checkForCaseInsensitiveUserDuplicates(appId, 'emails.address', 'Email', email, {
      mongoClient: client,
    });
    const { insertedId: userId } = await usersCollection.insertOne(newUser);

    // Perform another check after insert, in case a matching user has been
    // inserted in the meantime
    try {
      await checkForCaseInsensitiveUserDuplicates(appId, 'username', 'Username', username, {
        ownUserId: userId,
        mongoClient: client,
      });
      await checkForCaseInsensitiveUserDuplicates(appId, 'emails.address', 'Email', email, {
        ownUserId: userId,
        mongoClient: client,
      });
    } catch (ex) {
      // Remove inserted user if the check fails
      await usersCollection.removeOne({ _id: userId });
      throw ex;
    }

    // TODO: send verification email here
    // see packages/accounts-password/password_server.js:866

    return { userId };
  } finally {
    client.close();
  }
};
