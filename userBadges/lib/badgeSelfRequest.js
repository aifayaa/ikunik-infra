import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_USERS,
  COLL_USER_BADGES,
} = mongoCollections;

export default async (appId, userId, userBadgeId) => {
  const client = await MongoClient.connect();

  try {
    const user = await client.db().collection(COLL_USERS).findOne({ _id: userId, appId });
    const userBadges = user.badges || [];

    const badge = await client
      .db()
      .collection(COLL_USER_BADGES)
      .findOne({ _id: userBadgeId, appId });

    if (!badge) {
      throw new Error('content_not_found');
    }

    if (badge.management !== 'request') {
      throw new Error('wrong_argument_value');
    }

    const userBadgesHash = userBadges.reduce((acc, itm) => {
      acc[itm.id] = true;
      return (acc);
    }, { owned: {}, requested: {} });

    if (!userBadgesHash[userBadgeId]) {
      const actions = {};

      if (!user.badges) {
        actions.$set = { badges: [{ id: userBadgeId, status: 'requested' }] };
      } else {
        actions.$addToSet = {
          badges: { id: userBadgeId, status: 'requested' },
        };
      }

      await client.db().collection(COLL_USERS).updateOne(
        { _id: userId, appId },
        actions,
      );
    }
  } finally {
    client.close();
  }
};
