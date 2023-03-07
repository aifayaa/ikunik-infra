import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { WordpressAPI } from '../../libs/backends/wordpress';
import hashLoginToken from '../../account/lib/hashLoginToken';
import { setUserPermissions, setUserBadges } from './backends/wordpressLogin';

const {
  COLL_APPS,
  COLL_USERS,
} = mongoCollections;

const SEVEN_DAYS_IN_MS = 7 * 86400 * 1000;

export default async (userId, appId, loginToken) => {
  const client = await MongoClient.connect();
  const returnData = {};

  try {
    const [app, user] = await Promise.all([
      client
        .db()
        .collection(COLL_APPS)
        .findOne({
          _id: appId,
        }),
      client
        .db()
        .collection(COLL_USERS)
        .findOne({
          _id: userId,
          appId,
        }),
    ]);

    if (!app) {
      throw new Error('app_not_found');
    }

    if (!user) {
      throw new Error('user_not_found');
    }

    const hashedToken = hashLoginToken(loginToken);
    const loginTokenObj = user.services.resume.loginTokens.find(
      (itm) => (itm.hashedToken === hashedToken),
    );

    if (!loginTokenObj) {
      // eslint-disable-next-line no-console
      console.error('Could not find login token for', {
        user,
        loginToken,
        hashedToken,
        'user.services.resume.loginTokens': user.services.resume.loginTokens,
      });
      return (false);
    }

    if (!app.backend) {
      return (returnData);
    }

    if (app.backend.type === 'wordpress' && loginTokenObj.backend === 'wordpress') {
      const wpApi = new WordpressAPI(app);

      try {
        let response = await wpApi.authCall(
          'GET',
          '/crowdaa-sync/v1/session/checks',
          loginTokenObj.wpToken,
          null,
        );

        response = JSON.parse(response);

        if (response && response.success) {
          const userWhere = { _id: userId, appId };
          const user$set = {};

          if (response.token && response.token !== loginTokenObj.wpToken) {
            userWhere['services.resume.loginTokens.hashedToken'] = hashedToken;
            user$set['services.resume.loginTokens.$.when'] = new Date();
            user$set['services.resume.loginTokens.$.wpToken'] = response.token;
            user$set['services.resume.loginTokens.$.expiresAt'] = Date.now() + SEVEN_DAYS_IN_MS;
          }

          if (response.user_id && response.user_id !== user.services.wordpress.userId) {
            user$set['services.wordpress.userId'] = response.user_id;
          }

          if (response.autologin_token) {
            user$set['services.wordpress.autoLoginToken'] = response.autologin_token;
            returnData.autoLoginToken = response.autologin_token;
          }

          if (Object.keys(user$set).length > 0) {
            await client.db().collection(COLL_USERS).updateOne(
              userWhere,
              { $set: user$set },
            );
          }

          if (response.user_badges) {
            await setUserBadges(client, user, response.user_badges);
          }

          if (response.permissions) {
            await setUserPermissions(client, user, response.permissions);
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error when calling WP session/checks for ', userId, e);
      }
    }
  } finally {
    client.close();
  }

  return (returnData);
};
