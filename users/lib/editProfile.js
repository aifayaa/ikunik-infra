/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS, COLL_PICTURES, COLL_USERS } = mongoCollections;

export default async (
  userId,
  appId,
  { username, avatar: avatarId, ...extraFields }
) => {
  const $set = {
    'profile.username': `${username}`,
  };
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const user = await db
      .collection(COLL_USERS)
      .findOne({ _id: userId, appId });
    if (!user) {
      throw new Error('user_not_found');
    }

    const app = await db.collection(COLL_APPS).findOne({ _id: appId });
    if (
      app &&
      app.settings &&
      app.settings.public &&
      app.settings.public.requiresUserInput &&
      app.settings.public.requiresUserInput.profile
    ) {
      const { profile: extraProfileFields } =
        app.settings.public.requiresUserInput;
      extraProfileFields.forEach(({ field, optionnal }) => {
        if (
          field === 'username' ||
          field === 'avatar' ||
          field === 'avatarId'
        ) {
          return;
        }
        if (!optionnal && !extraFields[field]) {
          throw new Error('mal_formed_request');
        }

        user.profile[field] = extraFields[field];
      });

      Object.keys(user.profile).forEach((key) => {
        $set[`profile.${key}`] = user.profile[key];
      });
    }

    if (avatarId) {
      const avatarObj = await db
        .collection(COLL_PICTURES)
        .findOne({ _id: avatarId, appId });
      if (!avatarObj || !avatarObj.mediumUrl) {
        throw new Error('missing_avatar');
      }

      $set['profile.avatarId'] = avatarId;
      $set['profile.avatar'] = avatarObj.mediumUrl;
    }

    const { matchedCount } = await db.collection(COLL_USERS).updateOne(
      {
        _id: userId,
        appId,
      },
      {
        $set,
      }
    );

    return !!matchedCount;
  } finally {
    client.close();
  }
};
