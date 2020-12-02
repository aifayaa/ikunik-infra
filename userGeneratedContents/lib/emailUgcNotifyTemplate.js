import MongoClient from '../../libs/mongoClient';
import { intlInit, formatMessage } from '../../libs/intl/intl';

const {
  DB_NAME,
  COLL_USERS,
  COLL_APPS,
} = process.env;

export default async (userId, appId, data, lang, { isEdition = false } = {}) => {
  const client = await MongoClient.connect();
  try {
    const [user, app] = await Promise.all([
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
    ]);

    intlInit(lang);

    const editionType = (isEdition ? formatMessage('ugc:edition_type_edited') : formatMessage('ugc:edition_type_posted'));
    return {
      body: formatMessage('ugc:new_ugc_content_email.html', {
        editionType,
        userId: user._id,
        username: user.profile.username,
        appName: app.name,
        data: JSON.stringify(data, null, 2),
      }),
      subject: formatMessage('ugc:new_ugc_content_email.title', { editionType, appName: app.name }),
    };
  } finally {
    client.close();
  }
};
