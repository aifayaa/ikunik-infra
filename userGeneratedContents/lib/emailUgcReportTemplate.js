import MongoClient from '../../libs/mongoClient';
import { intlInit, formatMessage } from '../../libs/intl/intl';

const {
  DB_NAME,
  COLL_USERS,
  COLL_APPS,
  COLL_USER_GENERATED_CONTENTS,
  REACT_APP_PRESS_SERVICE_URL,
  COLL_PICTURES,
  REACT_APP_API_URL,
} = process.env;

export default async (userId, appId, ugcId, reason, details, lang) => {
  const client = await MongoClient.connect();
  const db = client.db(DB_NAME);
  try {
    const [user, app, [ugc]] = await Promise.all([
      db
        .collection(COLL_USERS)
        .findOne({
          _id: userId,
          appIds: appId,
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
            $project: {
              data: 1,
              type: 1,
              dataPicture: 1,
              rootParentCollection: 1,
              rootParentId: 1,
            },
          },
        ])
        .toArray(),
    ]);

    [ugc.dataPicture] = ugc.dataPicture;
    if (ugc.dataPicture) {
      ugc.dataPictureUrl = `${REACT_APP_API_URL}/pictures/${ugc.dataPicture._id}/datalocation?appId=${appId}&quality=medium,thumb,large`;
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
      body: formatMessage(`ugc:reported_ugc_${ugc.type}_email.html`, {
        userId: user._id,
        username: user.profile.username,
        appName: app.name,
        ugc,
        user,
        ugcDetails: `$t(ugc:ugc_user_data_email.${ugc.type})`,
        reason,
        details,
        globalModerationUrl: `${REACT_APP_PRESS_SERVICE_URL}/${appId}/moderation`,
      }),
      subject: formatMessage(`ugc:reported_ugc_${ugc.type}_email.title`, { appName: app.name, ugc, user }),
    };
  } finally {
    client.close();
  }
};
