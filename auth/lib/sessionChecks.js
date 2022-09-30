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

  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne({
        _id: appId,
      });

    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({
        _id: userId,
        appId,
      });

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
      return;
    }

    if (!app.backend) {
      return;
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
          if (response.token && response.token !== loginTokenObj.wpToken) {
            await client
              .db()
              .collection(COLL_USERS)
              .updateOne({
                _id: userId,
                appId,
                'services.resume.loginTokens.hashedToken': hashedToken,
              }, { $set: {
                'services.resume.loginTokens.$.when': new Date(),
                'services.resume.loginTokens.$.wpToken': response.token,
                'services.resume.loginTokens.$.expiresAt': Date.now() + SEVEN_DAYS_IN_MS,
              } });
          }

          if (response.user_badges) {
            await setUserBadges(client, user, response.user_badges);
          }

          if (response.permissions) {
            await setUserPermissions(client, user, response.permissions);
          }

          if (response.user_id && response.user_id !== user.services.wordpress.userId) {
            await client.db().collection(COLL_USERS).updateOne(
              { _id: userId, appId },
              { $set: { 'services.wordpress.userId': response.user_id } },
            );
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
};
