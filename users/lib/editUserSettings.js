/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

function isBool(x) {
  return typeof x === 'boolean';
}

export const allowedSettingsChecks = {
  'notifications.ugc_comment_reactions': isBool,
  'notifications.ugc_comment_replies': isBool,
  'notifications.ugc_post_reactions': isBool,
  'notifications.ugc_post_replies': isBool,
};

export default async (userId, appId, newSettings) => {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const user = await db
      .collection(COLL_USERS)
      .findOne({ _id: userId, appId });
    if (!user) {
      throw new Error('user_not_found');
    }

    const $set = Object.keys(newSettings).reduce((acc, key) => {
      acc[`settings.${key}`] = newSettings[key];
      return acc;
    }, {});

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
