/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { appUserCheckUsername } from './appUserChecks.ts';

const { ADMIN_APP } = process.env;

const { COLL_APPS, COLL_PICTURES, COLL_USERS } = mongoCollections;

export default async (
  userId,
  appId,
  {
    username,
    firstname,
    lastname,
    avatar: avatarId,
    '@email': email,
    ...extraFields
  }
) => {
  console.log('RooUsrena', username);
  const $set = {
    'profile.username': `${username}`,
  };
  const $unset = {};
  if (firstname) {
    $set['profile.firstname'] = firstname;
  } else if (firstname === null) {
    $unset['profile.firstname'] = '';
  }
  if (lastname) {
    $set['profile.lastname'] = lastname;
  } else if (lastname === null) {
    $unset['profile.lastname'] = '';
  }

  await appUserCheckUsername(username, { appId });

  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const user = await db
      .collection(COLL_USERS)
      .findOne({ _id: userId, appId });
    if (!user) {
      throw new Error('user_not_found');
    }

    if (user.appId === ADMIN_APP && email) {
      if (email) {
        const userWithEmail = await db
          .collection(COLL_USERS)
          .findOne({ _id: { $ne: user._id }, appId, 'emails.address': email });
        if (userWithEmail) {
          throw new Error('email_already_exists');
        }
        $set['emails.0.address'] = email;
      }
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
          field === 'firstname' ||
          field === 'lastname' ||
          field === 'avatar' ||
          field === 'avatarId'
        ) {
          return;
        }
        if (!optionnal && !extraFields[field]) {
          console.log('DEBUG', { field, extraFields, optionnal });
          throw new Error('mal_formed_request');
        }

        user.profile[field] = extraFields[field];
        if (extraFields[field] === null) {
          $unset[`profile.${field}`] = '';
        } else {
          $set[`profile.${field}`] = user.profile[field];
        }
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
    } else if (avatarId === null) {
      $unset['profile.avatarId'] = '';
      $unset['profile.avatar'] = '';
    }

    const updates = {
      $set,
    };
    if (Object.keys($unset).length > 0) {
      updates.$unset = $unset;
    }
    console.log('DBG', { userId, appId }, updates);
    const { matchedCount } = await db.collection(COLL_USERS).updateOne(
      {
        _id: userId,
        appId,
      },
      updates
    );

    return !!matchedCount;
  } finally {
    client.close();
  }
};
