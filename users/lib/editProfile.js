import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PICTURES, COLL_USERS } = mongoCollections;

export default async (userId, appId, {
  username,
  avatar: avatarId,
}) => {
  const $set = {
    'profile.username': `${username}`,
  };
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    if (avatarId) {
      const avatarObj = await db.collection(COLL_PICTURES).findOne({ _id: avatarId, appId });
      if (!avatarObj || !avatarObj.mediumUrl) {
        throw new Error('missing_avatar');
      }

      $set['profile.avatarId'] = avatarId;
      $set['profile.avatar'] = avatarObj.mediumUrl;
    }

    const { matchedCount } = await db
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
