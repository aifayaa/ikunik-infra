// based on meteor accounts-password module
// createUser method from
// https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { checkPassword } from './password';
import hashLoginToken from './hashLoginToken';
import Random from '../../libs/account_utils/random';
import { wordpressLogin } from './backends/wordpressLogin';

const {
  ADMIN_APP,
} = process.env;

const {
  COLL_USERS,
  COLL_APPS,
} = mongoCollections;

export const login = async (rawEmail, username, password, appId) => {
  const email = rawEmail && rawEmail.toLowerCase();
  const client = await MongoClient.connect();

  try {
    const usersCollection = client.db().collection(COLL_USERS);
    const appsCollection = client.db().collection(COLL_APPS);

    const app = await appsCollection.findOne(
      { _id: appId },
      { projection: {
        _id: true,
        backend: true,
        'settings.press.env.apiKeyCanBeChanged': true,
      } },
    );
    if (!app) throw new Error('app_not_found');

    if (appId !== ADMIN_APP && app.backend) {
      switch (app.backend.type) {
        case 'wordpress':
          return (wordpressLogin(username, password, app));
        default:
          throw new Error('unknown_backend');
      }
    }

    const selector = { appId };
    if (email) {
      selector['emails.address'] = email;
    } else {
      selector.username = username;
    }
    let user = await usersCollection.findOne(selector);
    let userIsAdminForPreview = false;
    if (!user) {
      if (appId !== ADMIN_APP && app.settings.press.env.apiKeyCanBeChanged) {
        userIsAdminForPreview = true;
        selector.appId = ADMIN_APP;
        user = await usersCollection.findOne(selector);
      }

      if (!user) {
        throw new Error('user_not_found');
      }
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

    if (userIsAdminForPreview) {
      const newUser = {
        _id: Random.id(),
        createdAt: new Date(),
        username: username || user.username || email.replace(/@.*/, `-${Random.id(10)}`),
        emails: [{ address: email }],
        services: {
          password: user.services.password,
          resume: {
            loginTokens: [{
              hashedToken: hashLoginToken(token),
              when: new Date(),
            }],
          },
        },
        appId,
        profile: user.profile,
        previewForAdmin: user._id,
      };

      const inserted = await usersCollection.insertOne(newUser);
      user.previewForAdmin = user._id;
      user._id = inserted.insertedId;
    } else {
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

      if (user.previewForAdmin) {
        const adminUser = await usersCollection.findOne({
          _id: user.previewForAdmin,
          appId: ADMIN_APP,
        }, { projection: { _id: 1 } });
        if (!adminUser) {
          await usersCollection.deleteOne({ _id: user._id, appId });

          throw new Error('user_not_found');
        }
      }
    }

    return {
      userId: user._id,
      previewForAdmin: user.previewForAdmin,
      authToken: token,
    };
  } finally {
    client.close();
  }
};
