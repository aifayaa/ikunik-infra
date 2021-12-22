import get from 'lodash/get';
import set from 'lodash/set';
import mongoCollections from '../../../libs/mongoCollections.json';

const {
  COLL_CONTENT_BY_USER_METRIC,
  COLL_AUDIOS,
  COLL_VIDEOS,
  COLL_USERS,
  COLL_PUSH_NOTIFICATIONS,
} = mongoCollections;

const pipelineLocationStart = (userId, appId, coordinates, range) => [
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
      from: COLL_CONTENT_BY_USER_METRIC,
      localField: '_id',
      foreignField: 'user_ID',
      as: 'contentByUserMetric',
    },
  },
  {
    $unwind: {
      path: '$contentByUserMetric',
      preserveNullAndEmptyArrays: false,
    },
  },
  {
    $lookup: {
      from: COLL_AUDIOS,
      localField: 'contentByUserMetric.content_ID',
      foreignField: '_id',
      as: 'audio',
    },
  },
  {
    $lookup: {
      from: COLL_VIDEOS,
      localField: 'contentByUserMetric.content_ID',
      foreignField: '_id',
      as: 'video',
    },
  },
  {
    $project: {
      contentByUserMetric: '$contentByUserMetric',
      track: {
        $concatArrays: ['$audio', '$video'],
      },
    },
  },
  {
    $unwind: {
      path: '$track',
      preserveNullAndEmptyArrays: false,
    },
  },
  {
    $lookup: {
      from: 'Project',
      localField: 'track.project_ID',
      foreignField: '_id',
      as: 'project',
    },
  },
  {
    $unwind: {
      path: '$project',
      preserveNullAndEmptyArrays: false,
    },
  },
  {
    $match: {
      'project.fromUserId': userId,
      'project.appId': appId,
    },
  },
  {
    $group: {
      _id: '$_id',
      user_ID: { $first: '$_id' },
      views: { $sum: '$contentByUserMetric.views' },
      shares: { $sum: '$contentByUserMetric.shares' },
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
  { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
];

const pipelineStart = (userId, appId) => [
  {
    $match: {
      fromUserId: userId,
      appId,
    },
  },
  {
    $lookup: {
      from: COLL_AUDIOS,
      localField: '_id',
      foreignField: 'project_ID',
      as: 'audios',
    },
  },
  {
    $lookup: {
      from: COLL_VIDEOS,
      localField: '_id',
      foreignField: 'project_ID',
      as: 'videos',
    },
  },
  {
    $project: {
      audioIds: {
        $map: {
          input: '$audios',
          as: 'audio',
          in: '$$audio._id',
        },
      },
      videoIds: {
        $map: {
          input: '$videos',
          as: 'video',
          in: '$$video._id',
        },
      },
    },
  },
  {
    $project: {
      contentIds: {
        $concatArrays: ['$audioIds', '$videoIds'],
      },
    },
  },
  {
    $unwind: {
      path: '$contentIds',
      preserveNullAndEmptyArrays: false,
    },
  },
  {
    $lookup: {
      from: COLL_CONTENT_BY_USER_METRIC,
      localField: 'contentIds',
      foreignField: 'content_ID',
      as: 'contentByUserMetric',
    },
  },
  {
    $unwind: {
      path: '$contentByUserMetric',
      preserveNullAndEmptyArrays: false,
    },
  },
  {
    $group: {
      _id: '$contentByUserMetric.user_ID',
      user_ID: { $first: '$contentByUserMetric.user_ID' },
      views: { $sum: '$contentByUserMetric.views' },
      shares: { $sum: '$contentByUserMetric.shares' },
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
  { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
];

export default (userId, appId, {
  artist,
  city,
  coordinates,
  country,
  gender,
  hasEmail,
  hasNotification,
  hasText,
  languages,
  maximumAge,
  minFBFriends,
  minimumAge,
  project,
  purchased,
  range,
  search,
  track,
  sortBy,
  sortOrder,
}) => {
  const pipeline = coordinates
    ? pipelineLocationStart(userId, appId, coordinates, range)
    : pipelineStart(userId, appId);
  pipeline.push({ $sort: { [sortBy || 'views']: (sortOrder === 'asc' ? 1 : -1) } });
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

  if (coordinates) {
    if (project || artist || track) {
      pipeline.splice(9, 0, {
        $match: { $and: [] },
      });
    }
    if (project) pipeline[9].$match.$and.push({ 'project._id': project });

    if (artist) pipeline[9].$match.$and.push({ 'project.artist_ID': artist });

    if (track) pipeline[9].$match.$and.push({ 'contentByUserMetric.content_ID': track });
  } else {
    if (project) set(pipeline, '[0].$match._id', project);

    if (artist) set(pipeline, '[0].$match.artist_ID', artist);

    if (track) pipeline.splice(6, 0, { $match: { contentIds: track } });
  }

  const match = { $match: { $and: [] } };
  if (search) {
    match.$match.$and.push({
      $or: [
        { 'user.about': { $regex: new RegExp(search) } },
        { 'user.profile.username': { $regex: new RegExp(search) } },
        { 'user.profile.tags': search },
      ],
    });
  }
  if (minimumAge) match.$match.$and.push({ 'user.services.facebook.age_range.min': { $gte: parseInt(minimumAge, 10) } });
  if (maximumAge) match.$match.$and.push({ 'user.services.facebook.age_range.max': { $lte: parseInt(maximumAge, 10) } });
  if (get(gender, 'length') > 0) match.$match.$and.push({ 'user.profile.gender': gender });
  if (hasEmail) {
    match.$match.$and.push({ $or: [
      { 'user.email': { $exists: true } },
      { 'user.profile.email': { $exists: true } },
      { 'user.emails.0.address': { $exists: true } },
    ] });
  }
  if (hasNotification) match.$match.$and.push({ endpoints: { $exists: true, $ne: [] } });
  if (hasText) match.$match.$and.push({ 'user.profile.phone': { $exists: true } });
  if (get(languages, 'length') > 0) match.$match.$and.push({ 'user.services.facebook.locale': languages });
  if (get(country, 'length') > 0) match.$match.$and.push({ 'user.country': country });
  if (get(city, 'length') > 0) match.$match.$and.push({ 'user.location.city': city });
  if (minFBFriends) match.$match.$and.push({ 'user.profile.numFBFriends': { $gte: parseInt(minFBFriends, 10) } });
  if (get(purchased, 'length', 0) === 1) {
    if (purchased[0] === 'yes') match.$match.$and.push({ purchased: true });
    else match.$match.$and.push({ purchased: { $exists: false } });
  }
  if (match.$match.$and.length > 0) pipeline.push(match);

  return pipeline;
};
