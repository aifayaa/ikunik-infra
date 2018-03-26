import { MongoClient } from 'mongodb';
import get from 'lodash/get';
import set from 'lodash/set';
import winston from 'winston';

const pipelineLocationStart = (location, range) => [
  {
    $geoNear: {
      near: {
        type: 'Point',
        coordinates: Object.values(JSON.parse(decodeURIComponent(location))).reverse()
          .map(Number.parseFloat),
      },
      distanceField: 'result',
      includeLocs: 'location.loc',
      spherical: true,
      maxDistance: range | 0,
    },
  },
  {
    $lookup: {
      from: 'contentByUserMetric',
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
      from: 'audio',
      localField: 'contentByUserMetric.content_ID',
      foreignField: '_id',
      as: 'audio',
    },
  },
  {
    $lookup: {
      from: 'video',
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
    $group: {
      _id: '$_id',
      user_ID: { $first: '$_id' },
      views: { $sum: '$contentByUserMetric.views' },
      shares: { $sum: '$contentByUserMetric.shares' },
    },
  },
  {
    $lookup: {
      from: 'users',
      localField: 'user_ID',
      foreignField: '_id',
      as: 'user',
    },
  },
  { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
];

const pipelineStart = (userId => [
  { $match: { fromUserId: userId } },
  {
    $project: {
      audioIds: {
        $cond: { if: { $isArray: ['$listOAudioIDs'] }, then: '$listOAudioIDs', else: [] },
      },
      videoIds: {
        $cond: { if: { $isArray: ['$listOVideoIDs'] }, then: '$listOVideoIDs', else: [] },
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
      from: 'contentByUserMetric',
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
      from: 'users',
      localField: 'user_ID',
      foreignField: '_id',
      as: 'user',
    },
  },
  { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
]);

const doPipeline = (userId, {
  artist,
  city,
  country,
  gender,
  languages,
  location,
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
  const pipeline = location ? pipelineLocationStart(location, range) : pipelineStart(userId);
  pipeline.push({ $sort: { [sortBy || 'views']: (sortOrder === 'desc' ? 1 : -1) } });

  if (location) {
    if (project || artist || track) pipeline.splice(9, 0, { $match: { $and: [] } });

    if (project) pipeline[9].$match.$and.push({ 'project._id': project });

    if (artist) pipeline[9].$match.$and.push({ 'project.artist_ID': artist });

    if (track) pipeline[9].$match.$and.push({ 'contentByUserMetric.content_ID': track });
  } else {
    if (project) set(pipeline, '[0].$match._id', project);

    if (artist) set(pipeline, '[0].$match.artist_ID', artist);

    if (track) pipeline.splice(4, 0, { $match: { contentIds: track } });
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
  if (minimumAge) match.$match.$and.push({ 'user.services.facebook.age_range.min': { $gte: minimumAge } });
  if (maximumAge) match.$match.$and.push({ 'user.services.facebook.age_range.max': { $lte: maximumAge } });
  if (get(gender, 'length') > 0) match.$match.$and.push({ 'user.profile.gender': gender });
  if (get(languages, 'length') > 0) match.$match.$and.push({ 'user.services.facebook.locale': languages });
  if (get(country, 'length') > 0) match.$match.$and.push({ 'user.country': country });
  if (get(city, 'length') > 0) match.$match.$and.push({ 'user.location.city': city });
  if (minFBFriends) match.$match.$and.push({ 'user.profile.numFBFriends': { $gte: minFBFriends } });
  if (get(purchased, 'length', 0) === 1) {
    if (purchased[0] === 'yes') match.$match.$and.push({ purchased: true });
    else match.$match.$and.push({ purchased: { $exists: false } });
  }
  if (match.$match.$and.length > 0) pipeline.push(match);

  return pipeline;
};

const doSeach = async (pipeline, { page, limit = 20, location }) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const countPipeline = pipeline.concat({ $group: { _id: null, fancount: { $sum: 1 } } });
    if (page > 1) pipeline.push({ $skip: (page - 1) * limit | 0 });
    pipeline.push({ $limit: limit | 0 });
    const [crowd, fancount] = await Promise.all([
      client.db(process.env.DB_NAME).collection(location ? 'users' : process.env.COLL_NAME).aggregate(pipeline)
        .toArray(),
      client.db(process.env.DB_NAME).collection(location ? 'users' : process.env.COLL_NAME).aggregate(countPipeline)
        .toArray(),
    ]);
    return { crowd, count: get(fancount, '[0].fancount', 0) };
  } finally {
    client.close();
  }
};

export const handleSeach = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    winston.info('request', userId, event.queryStringParameters);
    const pipeline = doPipeline(userId, event.queryStringParameters || {});
    const results = await doSeach(pipeline, event.queryStringParameters || {});
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    winston.error(e);
    const response = {
      statusCode: 500,
      message: e.message,
    };
    callback(null, response);
  }
};
