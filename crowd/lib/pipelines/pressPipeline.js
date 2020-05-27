const {
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
    contentCollection: COLL_USERS,
    type: 'geolocation',
    trashed: false,
  };

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
        from: COLL_USER_METRICS,
        localField: 'userId',
        foreignField: 'userId',
        as: 'userMetric',
      },
    },
    {
      $unwind: {
        path: '$userMetric',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $replaceRoot: {
        newRoot: '$userMetric',
      },
    },
    {
      $match,
    },
    {
      $group: {
        _id: '$userId',
        user_ID: { $first: '$userId' },
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
