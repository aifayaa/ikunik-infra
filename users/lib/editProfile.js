import MongoClient from '../../libs/mongoClient';

const {
  COLL_PICTURES,
  COLL_USERS,
  DB_NAME,
} = process.env;

export default async (userId, appId, {
  avatar,
  username,
}) => {
  const $set = {
    'profile.username': `${username}`,
  };

  const client = await MongoClient.connect();

  try {
    if (avatar) {
      const picture = await client.db(DB_NAME)
        .collection(COLL_PICTURES)
        .findOne({ _id: avatar, appId });
      const { fromUserId, thumbUrl } = (picture || {});
      if (!fromUserId || !thumbUrl) {
        throw new Error('picture_not_found');
      }
      if (fromUserId !== userId) {
        throw new Error('forbidden');
      }
      $set['profile.avatar'] = thumbUrl;
      $set['profile.avatarId'] = avatar;
    }

    const { matchedCount } = await client
      .db(DB_NAME)
      .collection(COLL_USERS)
      .updateOne({
        _id: userId,
        appId,
      }, {
        $set,
      });

    return !!matchedCount;
  } finally {
    client.close();
  }
};
