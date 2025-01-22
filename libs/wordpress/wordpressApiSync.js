/* eslint-disable import/no-relative-packages */
import MongoClient from '../mongoClient';
import mongoCollections from '../mongoCollections.json';
import { WordpressAPI } from '../backends/wordpress';

const { COLL_APPS } = mongoCollections;

export async function syncUserBadges(user) {
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({
      _id: user.appId,
    });

    const wpApi = new WordpressAPI(app);
    const wpUserId =
      user.services &&
      user.services.wordpress &&
      user.services.wordpress.userId;

    await wpApi.call('POST', '/crowdaa-sync/v1/sync/badges/users', {
      user_id: wpUserId,
      badges: (user.badges || [])
        .filter(
          ({ status = 'assigned' }) =>
            status === 'validated' || status === 'assigned'
        )
        .map(({ id }) => id),
    });
  } finally {
    client.close();
  }
}
