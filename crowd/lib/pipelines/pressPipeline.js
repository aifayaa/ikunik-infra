const {
  COLL_PRESS_ARTICLES,
  COLL_PUSH_NOTIFICATIONS,
  COLL_USERS,
  COLL_USER_METRICS,
} = process.env;

const useLocationPipeline = (userId, appId, coordinates, range, articleId) => {
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
        includeLocs: 'location.loc',
        spherical: true,
        maxDistance: range | 0,
      },
    },
    {
      $lookup: {
        from: COLL_USER_METRICS,
        localField: '_id',
        foreignField: 'user_ID',
        as: 'user_metric',
      },
    },
    {
      $unwind: {
        path: '$user_metric',
        preserveNullAndEmptyArrays: true,
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

export default (userId, appId, {
  articleId = '',
  coordinates,
  range,
  search = '',
}) => {
  const pipeline = coordinates ?
    useLocationPipeline(userId, appId, coordinates, range, articleId) :
    useClassicPipeline(userId, appId, articleId);

  pipeline.push(
    {
      $lookup: {
        from: COLL_PUSH_NOTIFICATIONS,
        localField: 'user_ID',
        foreignField: 'userId',
        as: 'endpoints',
      },
    },
    {
      $addFields: {
        endpoints: {
          $filter: {
            input: '$endpoints',
            as: 'endpoint',
            cond: { $in: [appId, '$$endpoint.appIds'] },
          },
        },
      },
    },
  );

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
