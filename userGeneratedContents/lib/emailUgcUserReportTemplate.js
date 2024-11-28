/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { intlInit, formatMessage } from '../../libs/intl/intl';

const { REACT_APP_API_URL, REACT_APP_DASHBOARD_URL } = process.env;

const {
  COLL_APPS,
  COLL_PICTURES,
  COLL_USERS,
  COLL_USER_GENERATED_CONTENTS,
  COLL_VIDEOS,
} = mongoCollections;

export default async (userId, appId, ugcId, reason, details, lang) => {
  const client = await MongoClient.connect();
  const db = client.db();
  try {
    const [user, app, [ugc]] = await Promise.all([
      db.collection(COLL_USERS).findOne(
        {
          _id: userId,
          appId,
        },
        { projection: { 'profile.username': true } }
      ),
      db.collection(COLL_APPS).findOne(
        {
          _id: appId,
        },
        { projection: { name: true } }
      ),
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
            $lookup: {
              from: COLL_USERS,
              localField: 'userId',
              foreignField: '_id',
              as: 'author',
            },
          },
          {
            $unwind: '$author',
          },
          {
            $project: {
              author: 1,
              data: 1,
              dataPictures: 1,
              dataVideos: 1,
              rootParentCollection: 1,
              rootParentId: 1,
              type: 1,
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

    return {
      body: formatMessage(`ugc:reported_ugc_user_${ugc.type}_email.html`, {
        userId: user._id,
        username: user.profile.username,
        appName: app.name,
        ugc,
        author: ugc.author || { profile: {} },
        ugcDetails: `$t(ugc:ugc_user_data_email.${ugc.type})`,
        reason,
        details,
        mediaType,
        ugcModerationUrl: `${REACT_APP_DASHBOARD_URL}/apps/${appId}/moderation/${ugcId}`,
      }),
      subject: formatMessage(`ugc:reported_ugc_user_${ugc.type}_email.title`, {
        appName: app.name,
        ugc,
        user,
      }),
    };
  } finally {
    client.close();
  }
};
