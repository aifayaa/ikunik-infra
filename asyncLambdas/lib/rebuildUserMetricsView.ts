import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import mongoViews from '../../libs/mongoViews.json';

const { COLL_USER_METRICS, COLL_USERS } = mongoCollections;
const { VIEW_USER_METRICS_UUID_AGGREGATED } = mongoViews;

function makeFinalPipelineSteps(isUser: boolean) {
  return [
    {
      $set: {
        metricsGeoLast: {
          $cond: [
            { $eq: [{ $size: '$metricsGeo' }, 0] },
            null,
            { $arrayElemAt: ['$metricsGeo', -1] },
          ],
        },
      },
    },

    ...(isUser
      ? [
          {
            $lookup: {
              from: COLL_USERS,
              localField: 'userId',
              foreignField: '_id',
              as: 'user',
            },
          },
          {
            $unwind: {
              path: '$user',
              preserveNullAndEmptyArrays: true,
            },
          },
        ]
      : []),

    /* Final merge to the view */
    {
      $merge: {
        into: VIEW_USER_METRICS_UUID_AGGREGATED,
        whenMatched: 'replace',
      },
    },
  ];
}

export default async (appId: string) => {
  const client = await MongoClient.connect();

  const matchCommonQuery = {
    appId,
  };

  const commonGroupFields = {
    appId: { $first: { $literal: appId } },

    readingTime: { $sum: '$time' },
    totalReadingTime: { $sum: '$time' },
    firstMetricAt: { $min: '$createdAt' },
    lastMetricAt: { $max: '$createdAt' },

    metricsGeo: {
      $push: {
        $cond: [{ $eq: ['$type', 'geolocation'] }, '$$ROOT', '$$REMOVE'],
      },
    },
    metricsTime: {
      $push: {
        $cond: [{ $eq: ['$type', 'time'] }, '$$ROOT', '$$REMOVE'],
      },
    },
  };

  try {
    const cursorUsers = await client
      .db()
      .collection(COLL_USER_METRICS)
      .aggregate([
        { $match: { ...matchCommonQuery, userId: { $ne: null } } },
        {
          $group: {
            _id: { $concat: ['user-', '$userId'] },
            type: { $first: 'user' },

            deviceIds: {
              $addToSet: '$deviceId',
            },
            userId: { $first: '$userId' },

            ...commonGroupFields,
          },
        },
        ...makeFinalPipelineSteps(true),
      ]);

    const cursorUserDevices = await client
      .db()
      .collection(COLL_USER_METRICS)
      .aggregate([
        { $match: { ...matchCommonQuery, userId: { $ne: null } } },
        {
          $group: {
            _id: {
              $concat: ['userDevice-', '$userId', '-', '$deviceId'],
            },
            type: { $first: 'userDevice' },

            deviceId: { $first: '$deviceId' },
            userId: { $first: '$userId' },

            ...commonGroupFields,
          },
        },
        ...makeFinalPipelineSteps(true),
      ]);

    const cursorDevices = await client
      .db()
      .collection(COLL_USER_METRICS)
      .aggregate([
        { $match: { ...matchCommonQuery, userId: null } },
        {
          $group: {
            _id: {
              $concat: ['device-', '$deviceId'],
            },
            type: { $first: 'device' },

            deviceId: { $first: '$deviceId' },

            ...commonGroupFields,
          },
        },
        ...makeFinalPipelineSteps(false),
      ]);

    await Promise.all([
      cursorUsers.next(),
      cursorUserDevices.next(),
      cursorDevices.next(),
    ]);
  } finally {
    client.close();
  }
};
