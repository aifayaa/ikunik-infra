import MongoClient from '../../libs/mongoClient';

const {
  COLL_USERS,
  COLL_USER_BADGES,
} = process.env;

export default async (appId, userId, userBadgeId) => {
  const client = await MongoClient.connect();

  try {
    const badge = await client
      .db()
      .collection(COLL_USER_BADGES)
      .findOne({ _id: userBadgeId, appId });

    if (!badge) {
      throw new Error('content_not_found');
    }

    if (badge.management !== 'request' && badge.management !== 'public') {
      throw new Error('wrong_argument_value');
    }

    await client.db().collection(COLL_USERS).updateOne(
      { _id: userId, appId },
      {
        $pull: {
          badges: { id: userBadgeId },
        },
      },
    );
  } finally {
    client.close();
  }
};
