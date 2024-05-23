/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import { syncUserBadges } from '../../libs/wordpress/wordpressApiSync';

const { COLL_APPS, COLL_USERS, COLL_USER_BADGES } = mongoCollections;

export default async (appId, userId, userBadgeId) => {
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    const badge = await client
      .db()
      .collection(COLL_USER_BADGES)
      .findOne({ _id: userBadgeId, appId });

    if (!app) {
      throw new Error('app_not_found');
    }

    if (!badge) {
      throw new Error('content_not_found');
    }

    if (badge.management !== 'request' && badge.management !== 'public') {
      throw new Error('wrong_argument_value');
    }

    await client
      .db()
      .collection(COLL_USERS)
      .updateOne(
        { _id: userId, appId },
        {
          $pull: {
            badges: { id: userBadgeId },
          },
        }
      );

    if (app.backend && app.backend.type === 'wordpress') {
      const user = await client
        .db()
        .collection(COLL_USERS)
        .findOne({ _id: userId, appId });

      await syncUserBadges(user);
    }
  } finally {
    client.close();
  }
};
