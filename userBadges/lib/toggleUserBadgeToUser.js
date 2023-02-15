import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { syncUserBadges } from '../../libs/wordpress/wordpressApiSync';

const {
  COLL_APPS,
  COLL_USERS,
  COLL_USER_BADGES,
} = mongoCollections;

export default async (
  userBadgeId,
  appId,
  { action = 'add', userId, adminUserId },
) => {
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });

    if (!app) {
      throw new Error('app_not_found');
    }

    if (action === 'add') {
      const userBadgeObj = await client
        .db()
        .collection(COLL_USER_BADGES)
        .findOne({
          _id: userBadgeId,
          appId,
        });

      if (!userBadgeObj) {
        throw new Error('content_not_found');
      }

      await client.db().collection(COLL_USERS).updateOne(
        { _id: userId, appId },
        { $addToSet: { badges: {
          id: userBadgeObj._id,
          addedAt: new Date(),
          addedBy: adminUserId,
        } } },
      );
    } else if (action === 'remove') {
      await client.db().collection(COLL_USERS).updateOne(
        { _id: userId, appId },
        { $pull: { badges: {
          id: userBadgeId,
        } } },
      );
    } else if (action === 'validate') {
      await client.db().collection(COLL_USERS).updateOne(
        { _id: userId, appId, 'badges.id': userBadgeId },
        { $set: {
          'badges.$.status': 'validated',
          'badges.$.validatedAt': new Date(),
          'badges.$.validatedBy': adminUserId,
        } },
      );
    } else if (action === 'reject') {
      await client.db().collection(COLL_USERS).updateOne(
        { _id: userId, appId, 'badges.id': userBadgeId },
        { $set: {
          'badges.$.status': 'rejected',
          'badges.$.rejectedAt': new Date(),
          'badges.$.rejectedBy': adminUserId,
        } },
      );
    } else {
      return ({ success: false });
    }

    if (app.backend && app.backend.type === 'wordpress') {
      const user = await client.db().collection(COLL_USERS).findOne({ _id: userId, appId });

      await syncUserBadges(user);
    }

    return ({ success: true });
  } finally {
    client.close();
  }
};
