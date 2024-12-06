/* eslint-disable import/no-relative-packages */
import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';
import { checkPassword } from '../password';
import hashLoginToken from '../hashLoginToken';
import Random from '../../../libs/account_utils/random';
import { AppType } from '../../../apps/lib/appEntity';
import { filterUserPrivateFields } from '../../../users/lib/usersUtils';
import { newSessionTokenFor } from '../newSessionTokenFor';

const { ADMIN_APP } = process.env;

const { COLL_USERS } = mongoCollections;

export const crowdaaLogin = async (
  username: string,
  rawEmail: string,
  password: string,
  app: AppType,
  {
    noPasswordCheck = false,
  }: {
    noPasswordCheck?: boolean;
  } = {}
) => {
  const client = await MongoClient.connect();
  try {
    const usersCollection = client.db().collection(COLL_USERS);
    const email = rawEmail && rawEmail.toLowerCase();
    const { _id: appId } = app;
    const selector: {
      appId: string;
      'emails.address'?: string;
      username?: string;
    } = { appId };

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
        if (ADMIN_APP) {
          selector.appId = ADMIN_APP;
        }
        user = await usersCollection.findOne(selector);
      }

      if (!user) {
        throw new Error('user_not_found');
      }
    }

    if (
      !noPasswordCheck &&
      (!user.services ||
        !user.services.password ||
        !user.services.password.bcrypt)
    ) {
      throw new Error('User has no password set"');
    }

    if (!noPasswordCheck) {
      // throw error if check fail
      await checkPassword(user, password, { mongoClient: client });
    }

    let token;

    if (userIsAdminForPreview) {
      token = Random.secret();

      const newUser = {
        _id: Random.id(),
        createdAt: new Date(),
        username:
          username ||
          user.username ||
          email.replace(/@.*/, `-${Random.id(10)}`),
        emails: [{ address: email }],
        services: {
          password: user.services.password,
          resume: {
            loginTokens: [
              {
                hashedToken: hashLoginToken(token),
                when: new Date(),
              },
            ],
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
      const token = await newSessionTokenFor(user._id, appId);

      if (user.previewForAdmin) {
        const adminUser = await usersCollection.findOne(
          {
            _id: user.previewForAdmin,
            appId: ADMIN_APP,
          },
          { projection: { _id: 1 } }
        );
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
      user: filterUserPrivateFields(user),
    };
  } finally {
    client.close();
  }
};
