import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

function objGet(obj, keys, dft) {
  let keysArray = keys;
  let ret = obj;
  if (typeof keys === 'string') {
    keysArray = keys.split('.');
  } else {
    keysArray = Array.prototype.slice.call(keys);
  }

  while (keysArray.length > 0) {
    try {
      const key = keysArray.shift();
      ret = ret[key];
    } catch (e) {
      return (dft);
    }
  }

  if (ret === undefined) return (dft);

  return (ret);
}

const allowedSettings = [
  'press.env.articleFromCommunityDateFormat',
  'press.env.articleFromFeedDateFormat',
  'press.env.categoryArticleDateFormat',
  'press.env.communityArticleCommentsEnabled',
  'press.env.communityArticleDateFormat',
  'press.env.communityArticleShareEnabled',
  'press.env.displayArticleAuthor',
  'press.env.displayArticleLikesViews',
  'press.env.feedArticleCommentsEnabled',
  'press.env.feedArticleDateFormat',
  'press.env.feedArticleShareEnabled',
  'press.env.geolocation',
  'press.env.loginArticleRequired',
  'press.env.loginWithUsername',
  'press.env.phoneRegisterEnabled',
  'press.env.phoneRegisterRequired',
  'press.env.signInWithApple',
  'press.env.signInWithFacebook',
  'press.env.startTab',
  'press.env.tabOrder',
  'press.moderationRequired',
];

export default async (appId, settings) => {
  const client = await MongoClient.connect();

  try {
    const $set = {};
    let setOnce = false;

    allowedSettings.forEach((key) => {
      const val = objGet(settings, key, null);
      if (val !== null) {
        $set[`settings.${key}`] = val;
        setOnce = true;
      }
    });

    if (setOnce) {
      await client
        .db()
        .collection(COLL_APPS)
        .updateOne(
          { _id: appId },
          { $set },
        );
    }

    return ($set);
  } finally {
    client.close();
  }
};
