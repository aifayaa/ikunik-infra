import MongoClient from '../../libs/mongoClient';
import { intlInit, formatMessage } from '../../libs/intl/intl';

const {
  DB_NAME,
  COLL_USERS,
  COLL_APPS,
  REACT_APP_PRESS_SERVICE_URL,
  COLL_USER_GENERATED_CONTENTS,
  COLL_PICTURES,
  COLL_VIDEOS,
  REACT_APP_API_URL,
} = process.env;

export default async (userId, appId, ugcId, lang, { isEdition = false } = {}) => {
  const client = await MongoClient.connect();
  const db = client.db(DB_NAME);
  try {
    const [user, app, [ugc]] = await Promise.all([
      db
        .collection(COLL_USERS)
        .findOne({
          _id: userId,
          appId,
        }, { projection: { 'profile.username': true } }),
      db
        .collection(COLL_APPS)
        .findOne({
          _id: appId,
        }, { projection: { name: true } }),
      db
        .collection(COLL_USER_GENERATED_CONTENTS)
        .aggregate([
          {
            $match: {
              _id: ugcId,
              appId,
            },
          },
          {
            $lookup: {
              from: COLL_PICTURES,
              localField: 'data.pictures',
              foreignField: '_id',
              as: 'dataPictures',
            },
          },
          {
            $lookup: {
              from: COLL_VIDEOS,
              localField: 'data.videos',
              foreignField: '_id',
              as: 'dataVideos',
            },
          },
          {
            $project: {
              data: 1,
              type: 1,
              dataPictures: 1,
              dataVideos: 1,
              rootParentCollection: 1,
              rootParentId: 1,
            },
          },
        ])
        .toArray(),
    ]);

    ugc.mediaPictureUrl = '';
    let mediaType = '';
    if (ugc.dataPictures && ugc.dataPictures[0]) {
      ugc.mediaPictureUrl = `${REACT_APP_API_URL}/pictures/${ugc.dataPictures[0]._id}/datalocation?appId=${appId}&quality=medium,thumb,large`;
      mediaType = '$t(ugc:media_type_picture)';
    } else if (ugc.dataVideos && ugc.dataVideos[0]) {
      ugc.mediaPictureUrl = `${REACT_APP_API_URL}/videos/${ugc.dataVideos[0]._id}/thumblocation?appId=${appId}`;
      mediaType = '$t(ugc:media_type_video)';
    }

    if (ugc.type === 'comment') {
      const rootParent = await db
        .collection(ugc.rootParentCollection)
        .findOne({ _id: ugc.rootParentId });
      if (typeof rootParent.data === 'object') {
        ugc.rootParent = { ...rootParent, ...rootParent.data };
      } else {
        ugc.rootParent = rootParent;
      }
    }

    intlInit(lang);

    const editionType = (isEdition ? formatMessage('ugc:edition_type_edited') : formatMessage('ugc:edition_type_posted'));
    return {
      body: formatMessage(`ugc:new_ugc_${ugc.type}_email.html`, {
        editionType,
        userId: user._id,
        username: user.profile.username,
        appName: app.name,
        ugcModerationUrl: `${REACT_APP_PRESS_SERVICE_URL}/${appId}/moderation?contentId=${ugcId}`,
        ugcDetails: `$t(ugc:ugc_user_data_email.${ugc.type})`,
        user,
        ugc,
        mediaType,
      }),
      subject: formatMessage(`ugc:new_ugc_${ugc.type}_email.title`, { editionType, appName: app.name, ugc, user }),
    };
  } finally {
    client.close();
  }
};
