import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';
import hashLoginToken from '../hashLoginToken';
import Random from '../../../libs/account_utils/random';
import { WordpressAPI } from '../../../libs/backends/wordpress';
import { hashPassword } from '../password';

const { COLL_USERS } = mongoCollections;

export const wordpressLogin = async (username, password, app) => {
  const client = await MongoClient.connect();
  const wpApi = new WordpressAPI(app);
  const appId = app._id;

  try {
    const usersCollection = client.db().collection(COLL_USERS);
    let reply;

    try {
      reply = await wpApi.call('POST', '/jwt-auth/v1/token', {
        username,
        password,
      });
    } catch (e) {
      if (!e.response) {
        throw new Error('backend_network_error');
      } else if (e.error && e.error.message) {
        reply = e.error;
      } else {
        throw new Error('backend_error');
      }
    }

    if (!reply) {
      throw new Error('backend_error');
    }
    if (!reply.token) {
      if (reply.code === 'jwt_auth_failed') {
        throw new Error('invalid_credentials');
      } else {
        throw new Error('backend_error');
      }
    }

    const {
      token: wpToken,
      user_email: userEmail,
      user_nicename: userNicename,
      user_display_name: userDisplayName,
      autologin_token: autoLoginToken,
    } = reply;

    const selector = { appId, username };
    let user = await usersCollection.findOne(selector);
    const token = Random.secret();

    const loginToken = {
      hashedToken: hashLoginToken(token),
      when: new Date(),
      backend: 'wordpress',
      wpToken,
      expiresAt: Date.now() + 7 * 86400 * 1000,
    };
    const hashedPassword = await hashPassword(password);
    if (!user) {
      user = {
        _id: Random.id(),
        createdAt: new Date(),
        username,
        services: {
          wordpress: {
            userEmail,
            userNicename,
            userDisplayName,
          },
          resume: {
            loginTokens: [loginToken],
          },
          password: {
            bcrypt: hashedPassword,
          },
        },
        appId,
        profile: {
          username: userDisplayName || userNicename || username,
          email: userEmail,
        },
      };

      if (autoLoginToken) {
        user.services.wordpress.autoLoginToken = autoLoginToken;
      }

      await usersCollection.insertOne(user);
    } else {
      const update = {
        $set: {
          'services.wordpress.userEmail': userEmail,
          'services.wordpress.userNicename': userNicename,
          'services.wordpress.userDisplayName': userDisplayName,
          'services.password': {
            bcrypt: hashedPassword,
          },
        },
        $addToSet: {
          'services.resume.loginTokens': loginToken,
        },
      };
      if (autoLoginToken) {
        update.$set['services.wordpress.autoLoginToken'] = autoLoginToken;
      } else if (
        user.services &&
        user.services.wordpress &&
        user.services.wordpress.autoLoginToken
      ) {
        update.$unset['services.wordpress.autoLoginToken'] = '';
      }

      await usersCollection.updateOne(
        {
          _id: user._id,
          appId,
        },
        update,
      );
    }

    return {
      userId: user._id,
      authToken: token,
      autoLoginToken,
    };
  } finally {
    client.close();
  }
};
