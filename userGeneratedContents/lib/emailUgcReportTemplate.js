import MongoClient from '../../libs/mongoClient';
import { intlInit, formatMessage } from '../../libs/intl/intl';

const {
  DB_NAME,
  COLL_USERS,
  COLL_APPS,
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

// TODO: intl
export default async (userId, appId, contentId, reason, details, lang) => {
  const client = await MongoClient.connect();
  try {
    const [user, app, content] = await Promise.all([
      client
        .db(DB_NAME)
        .collection(COLL_USERS)
        .findOne({
          _id: userId,
          appIds: appId,
        }, { projection: { 'profile.username': true } }),
      client
        .db(DB_NAME)
        .collection(COLL_APPS)
        .findOne({
          _id: appId,
        }, { projection: { name: true } }),
      client
        .db(DB_NAME)
        .collection(COLL_USER_GENERATED_CONTENTS)
        .findOne({
          _id: contentId,
        }, { projection: { data: true } }),
    ]);

    intlInit(lang);

    return {
      body: formatMessage('ugc:reported_ugc_content_email_html', {
        userId: user._id,
        username: user.profile.username,
        appName: app.name,
        data: JSON.stringify(content.data, null, 2),
        reason,
        details,
      }),
      subject: formatMessage('ugc:reported_ugc_content_email_title', { appName: app.name }),
    };
  } finally {
    client.close();
  }
};
