import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { WordpressAPI } from '../../libs/backends/wordpress';
import hashLoginToken from '../../account/lib/hashLoginToken';

const {
  COLL_APPS,
  COLL_USERS,
} = mongoCollections;

export default async (badgeId, userId, appId, loginToken) => {
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

    if (!app.backend) return;

    if (app.backend.type === 'wordpress') {
      if (!app.backend.sync || !app.backend.sync.subscriptions) return;

      const hashedToken = hashLoginToken(loginToken);
      const loginTokenObj = user.services.resume.loginTokens.find(
        (itm) => (itm.hashedToken === hashedToken),
      );

      if (!loginTokenObj || !loginTokenObj.wpToken) {
        // eslint-disable-next-line no-console
        console.error(`Could not find a login token for user ${userId}/${appId}`, loginTokenObj);
        return;
      }

      try {
        const wpApi = new WordpressAPI(app);

        await wpApi.call(
          'POST',
          app.backend.sync.subscriptions,
          {
            badgeId,
            when: parseInt(Date.now() / 1000, 10),
          },
          { headers: { Authorization: `Bearer ${loginTokenObj.wpToken}` } },
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`Error calling purchase WP API for ${userId}/${appId}/${badgeId}`, e);
        return;
      }
    }
  } finally {
    client.close();
  }
};
