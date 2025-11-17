import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import mongoViews from '../../libs/mongoViews.json';

const { COLL_USER_METRICS, COLL_USERS } = mongoCollections;
const {
  VIEW_USER_METRICS_UUID_AGGREGATED,
  VIEW_USER_METRICS_UUID_AGGREGATED_META,
} = mongoViews;

function makeFinalPipelineSteps(type: 'device' | 'user' | 'userDevice') {
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

    ...(type === 'userDevice'
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

    /* Final $project to limit arrays sizes, so that we don't blow up mongodb limits (16MB per object) */
    {
      $project: {
        _id: 1,
        type: 1,

        deviceId: 1,
        deviceIds: 1,
        userId: 1,
        user: 1,

        appId: 1,
        readingTime: 1,
        totalReadingTime: 1,
        firstMetricAt: 1,
        lastMetricAt: 1,

        metricsGeo: { $slice: ['$metricsGeo', 100] },
        metricsTime: { $slice: ['$metricsTime', 100] },
      },
    },

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
      .collection(COLL_USERS)
      .aggregate([
        { $match: { appId } },
        { $project: { user: '$$ROOT' } },
        {
          $lookup: {
            from: COLL_USER_METRICS,
            localField: 'user._id',
            foreignField: 'userId',
            pipeline: [
              {
                $match: {
                  appId,
                },
              },
            ],
            as: 'allMetrics',
          },
        },
        {
          $unwind: {
            path: '$allMetrics',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            allMetrics: {
              $cond: {
                if: '$allMetrics',
                then: '$allMetrics',
                else: {},
              },
            },
            user: 1,
          },
        },
        {
          $addFields: {
            'allMetrics.user': '$user',
            'allMetrics.userId': '$user._id',
          },
        },
        {
          $replaceRoot: {
            newRoot: '$allMetrics',
          },
        },
        {
          $group: {
            _id: { $concat: ['user-', '$userId'] },
            type: { $first: 'user' },

            deviceIds: {
              $addToSet: '$deviceId',
            },
            userId: { $first: '$userId' },
            user: { $first: '$user' },

            ...commonGroupFields,
          },
        },
        ...makeFinalPipelineSteps('user'),
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
        ...makeFinalPipelineSteps('userDevice'),
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
        ...makeFinalPipelineSteps('device'),
      ]);

    await Promise.all([
      cursorUsers.next(),
      cursorUserDevices.next(),
      cursorDevices.next(),
    ]);

    await client
      .db()
      .collection(VIEW_USER_METRICS_UUID_AGGREGATED_META)
      .updateOne(
        { appId },
        { $set: { updatedAt: new Date() } },
        { upsert: true }
      );
  } finally {
    client.close();
  }
};
