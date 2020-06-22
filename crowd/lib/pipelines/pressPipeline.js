const {
  COLL_DEVICES,
  COLL_PRESS_ARTICLES,
  COLL_PUSH_NOTIFICATIONS,
  COLL_USERS,
  COLL_USER_METRICS,
} = process.env;

const useLocationPipeline = (userId, appId, coordinates, range, articleId) => {
  const $matchOnUserMetrics = {
    appIds: {
      $elemMatch: { $eq: appId },
    },
    type: 'geolocation',
    trashed: false,
    $or: [
      {
        contentCollection: COLL_USERS,
      },
      {
        contentCollection: COLL_DEVICES,
      },
    ],
  };

  const $match = {
    $expr: {
      $or: [
        {
          $and: [
            {
              $eq: ['$userId', '$$foreignUserId'],
            },
            {
              $ne: ['$userId', null],
            },
            {
              contentCollection: COLL_USERS,
            },
          ],
        },
        {
          $and: [
            {
              $eq: ['$deviceId', '$$foreignDeviceId'],
            },
            {
              $ne: ['$deviceId', null],
            },
            {
              contentCollection: COLL_DEVICES,
            },
          ],
        },
      ],
    },
    appIds: {
      $elemMatch: { $eq: appId },
    },
    contentCollection: COLL_PRESS_ARTICLES,
    type: 'time',
    trashed: false,
  };

  if (articleId) {
    $match.contentId = articleId;
  }

  return [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: Object.values(JSON.parse(coordinates)).reverse(),
        },
        distanceField: 'result',
        includeLocs: 'location',
        spherical: true,
        maxDistance: range | 0,
      },
    },
    {
      $match: $matchOnUserMetrics,
    },
    {
      $lookup: {
        as: 'um',
        from: COLL_USER_METRICS,
        let: {
          foreignDeviceId: '$deviceId',
          foreignUserId: '$userId',
        },
        pipeline: [{ $match }],
      },
    },
    {
      $unwind: {
        path: '$um',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $replaceRoot: {
        newRoot: '$um',
      },
    },
    {
      $addFields: {
        uuid: {
          $ifNull: ['$userId', '$deviceId'],
        },
      },
    },
    {
      $group: {
        _id: '$uuid',
        deviceId: { $first: '$deviceId' },
        elapsedTime: { $sum: '$time' },
        user_ID: { $first: '$userId' },
      },
    },
    {
      $lookup: {
        from: COLL_USERS,
        localField: 'user_ID',
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
  ];
};

const useClassicPipeline = (userId, appId, articleId) => {
  const $match = {
    appIds: {
      $elemMatch: { $eq: appId },
    },
    contentCollection: COLL_PRESS_ARTICLES,
    type: 'time',
    trashed: false,
  };

  if (articleId) {
    $match.contentId = articleId;
  }

  return [
    {
      $match,
    },
    {
      $addFields: {
        uuid: {
          $ifNull: ['$userId', '$deviceId'],
        },
      },
    },
    {
      $group: {
        _id: '$uuid',
        user_ID: { $first: '$userId' },
        deviceId: { $first: '$deviceId' },
        elapsedTime: { $sum: '$time' },
      },
    },
    {
      $lookup: {
        from: COLL_USERS,
        localField: 'user_ID',
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
  ];
};

export default (userId, appId, {
  articleId = '',
  coordinates,
  range,
  search = '',
}) => {
  const pipeline = coordinates
    ? useLocationPipeline(userId, appId, coordinates, range, articleId)
    : useClassicPipeline(userId, appId, articleId);

  pipeline.push({
    $lookup: {
      from: COLL_PUSH_NOTIFICATIONS,
      let: {
        userId: '$user_ID',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: ['$_id', '$$userId'],
            },
            appId,
          },
        },
      ],
      as: 'endpoints',
    },
  });

  if (search) {
    pipeline.push({
      $match: {
        'user.profile.username': {
          $regex: new RegExp(search),
        },
      },
    });
  }

  return pipeline;
};
