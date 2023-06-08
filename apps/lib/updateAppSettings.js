import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { formatMessage, intlInit } from '../../libs/intl/intl';
import { sendEmailTemplate } from '../../libs/email/sendEmail';

const { COLL_APPS } = mongoCollections;

const LANG = 'en';
const MAIL_TO = 'prod@crowdaa.com';

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
  'press.env.displayArticleCommentsCount',
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
  'press.env.signInWithSAML',
  'press.env.startTab',
  'press.env.tabOrder',
  'press.moderationRequired',
];

export default async (appId, settings) => {
  const client = await MongoClient.connect();

  try {
    const $set = {};
    const changed = {};
    let setOnce = false;

    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne({ _id: appId });

    allowedSettings.forEach((key) => {
      const val = objGet(settings, key, null);
      if (val !== null) {
        $set[`settings.${key}`] = val;
        setOnce = true;
        const prevVal = objGet(app.settings, key, null);
        if (prevVal !== val) {
          changed[`settings.${key}`] = `${JSON.stringify(prevVal)} -> ${JSON.stringify(val)}`;
        }
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

      intlInit(LANG);

      const subject = formatMessage('apps:updated_app_settings.title', {
        appName: app.name,
        region: process.env.REGION,
        stage: process.env.STAGE,
      });

      const formattedChanges = JSON.stringify(changed, null, 2)
        .replace(/>/g, '&gt;')
        .replace(/</g, '&lt;')
        .replace(/\n/g, '<br />\n')
        .replace(/ /g, '&nbsp;');
      const html = formatMessage('apps:updated_app_settings.html', {
        appName: app.name,
        formattedChanges,
      });

      await sendEmailTemplate(LANG, 'internal', MAIL_TO, subject, html);
    }

    return ($set);
  } finally {
    client.close();
  }
};
