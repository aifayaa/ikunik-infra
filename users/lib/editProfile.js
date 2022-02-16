import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

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
      const picture = await client.db()
        .collection(mongoCollections.COLL_PICTURES)
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
      .db()
      .collection(mongoCollections.COLL_USERS)
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
