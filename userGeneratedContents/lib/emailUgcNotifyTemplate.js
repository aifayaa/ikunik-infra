import MongoClient from '../../libs/mongoClient';
import { intlInit, formatMessage } from '../../libs/intl/intl';

const {
  DB_NAME,
  COLL_USERS,
  COLL_APPS,
  REACT_APP_PRESS_SERVICE_URL,
  COLL_USER_GENERATED_CONTENTS,
  COLL_PICTURES,
  REACT_APP_API_URL,
} = process.env;

export default async (userId, appId, ugcId, lang, { isEdition = false } = {}) => {
  const client = await MongoClient.connect();
  try {
    const [user, app, [ugc]] = await Promise.all([
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
        .aggregate([
          {
            $match: {
              _id: ugcId,
              appIds: appId,
            },
          },
          {
            $lookup: {
              from: COLL_PICTURES,
              localField: 'data.pictures',
              foreignField: '_id',
              as: 'dataPicture',
            },
          },
          {
            $project: { data: 1, type: 1, dataPicture: 1 },
          },
        ])
        .toArray(),
    ]);

    [ugc.dataPicture] = ugc.dataPicture;
    if (ugc.dataPicture) {
      ugc.dataPictureUrl = `${REACT_APP_API_URL}/pictures/${ugc.dataPicture._id}/datalocation?appId=${appId}&quality=medium,thumb,large`;
    }

    intlInit(lang);

    const editionType = (isEdition ? formatMessage('ugc:edition_type_edited') : formatMessage('ugc:edition_type_posted'));
    return {
      body: formatMessage('ugc:new_ugc_content_email.html', {
        editionType,
        userId: user._id,
        username: user.profile.username,
        appName: app.name,
        globalModerationUrl: `${REACT_APP_PRESS_SERVICE_URL}/${appId}/moderation`,
        ugcDetails: `$t(ugc:ugc_user_data_email.${ugc.type})`,
        ugc,
      }),
      subject: formatMessage('ugc:new_ugc_content_email.title', { editionType, appName: app.name }),
    };
  } finally {
    client.close();
  }
};
