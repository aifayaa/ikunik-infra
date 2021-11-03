import MongoClient from '../../libs/mongoClient';

const {
  COLL_USERS,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_DRAFTS,
  COLL_PRESS_CATEGORIES,
  COLL_USER_BADGES,
} = process.env;

export default async (userBadgeId, appId) => {
  const client = await MongoClient.connect();

  try {
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

    await client
      .db()
      .collection(COLL_USER_BADGES)
      .deleteOne({
        _id: userBadgeId,
        appId,
      });

    await client.db().collection(COLL_USERS).updateMany(
      { appId, 'badges.id': userBadgeObj._id },
      { $pull: { badges: {
        id: userBadgeObj._id,
      } } },
    );
    await client.db().collection(COLL_PRESS_CATEGORIES).updateMany(
      { appId, 'badges.list.id': userBadgeObj._id },
      { $pull: { 'badges.list': {
        id: userBadgeObj._id,
      } } },
    );
    await client.db().collection(COLL_PRESS_ARTICLES).updateMany(
      { appId, 'badges.list.id': userBadgeObj._id },
      { $pull: { 'badges.list': {
        id: userBadgeObj._id,
      } } },
    );
    await client.db().collection(COLL_PRESS_DRAFTS).updateMany(
      { appId, 'badges.list.id': userBadgeObj._id },
      { $pull: { 'badges.list': {
        id: userBadgeObj._id,
      } } },
    );
  } finally {
    client.close();
  }
};
