import { MongoClient } from 'mongodb';
import flatten from 'lodash/flatten';
import get from 'lodash/get';
import Lambda from 'aws-sdk/clients/lambda';
import phone from 'phone';
import set from 'lodash/set';
import winston from 'winston';

const lambda = new Lambda({
  region: process.env.AWS_REGION,
});

const pipelineLocationStart = (coordinates, range) => [
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
    $lookup: {
      from: 'audio',
      localField: '_id',
      foreignField: 'project_ID',
      as: 'audios',
    },
  },
  {
    $lookup: {
      from: 'video',
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
  const pipeline = coordinates ? pipelineLocationStart(coordinates, range) : pipelineStart(userId);
  pipeline.push({
    $lookup: {
      from: 'pushNotifications',
      localField: 'user_ID',
      foreignField: 'userId',
      as: 'endpoints',
    },
  });
  pipeline.push({ $sort: { [sortBy || 'views']: (sortOrder === 'desc' ? 1 : -1) } });

  if (coordinates) {
    if (project || artist || track) pipeline.splice(9, 0, { $match: { $and: [] } });

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
  if (minimumAge) match.$match.$and.push({ 'user.services.facebook.age_range.min': { $gte: minimumAge } });
  if (maximumAge) match.$match.$and.push({ 'user.services.facebook.age_range.max': { $lte: maximumAge } });
  if (get(gender, 'length') > 0) match.$match.$and.push({ 'user.profile.gender': gender });
  if (hasEmail) {
    match.$match.$and.push({ $or: [
      { 'user.email': { $exists: true } },
      { 'user.profile.email': { $exists: true } },
      { 'user.emails[0].address': { $exists: true } },
    ] });
  }
  if (hasNotification) match.$match.$and.push({ endpoints: { $exists: true, $ne: [] } });
  if (hasText) match.$match.$and.push({ 'user.profile.phone': { $exists: true } });
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

const doSearch = async (pipeline, { page = 1, limit = 20, coordinates, filterUserInfo }) => {
  if (typeof page !== 'number') page = parseInt(page, 10);
  if (typeof limit !== 'number') limit = parseInt(limit, 10);
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    if (filterUserInfo) {
      pipeline.push({
        $project: {
          _id: 1,
          'user.profile.username': 1,
          hasEmail: {
            $cond: {
              if: {
                $or: [
                  { $ifNull: ['$user.email', false] },
                  { $ifNull: ['$user.profile.email', false] },
                  { $ifNull: ['$user.emails', false] },
                ],
              },
              then: true,
              else: false,
            },
          },
          hasPhone: {
            $cond: {
              if: {
                $or: [
                  { $ifNull: ['$user.profile.phone', false] },
                ],
              },
              then: true,
              else: false,
            },
          },
          hasEndpoint: { $ne: ['$endpoints', []] },
          shares: 1,
          user_ID: 1,
          views: 1,
        },
      });
    }
    pipeline.push(
      {
        $group: {
          _id: null,
          fancount: { $sum: 1 },
          crowd: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          fancount: 1, crowd: { $slice: ['$crowd', (page - 1) * limit, limit] },
        },
      },
    );
    const [{ crowd, fancount }] = await client.db(process.env.DB_NAME)
      .collection(coordinates ? 'users' : process.env.COLL_NAME).aggregate(pipeline)
      .toArray();
    return { crowd, count: fancount };
  } finally {
    client.close();
  }
};

export const handleBlastSearchEmail = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { subject, template } = JSON.parse(event.body);
    Object.assign(event.queryStringParameters, { hasEmail: true });
    const pipeline = doPipeline(userId, event.queryStringParameters || {});
    const results = await doSearch(pipeline, event.queryStringParameters || {});
    const contacts = results.crowd.map(fan => ({
      email: fan.user.email || fan.user.profile.email || fan.user.emails[0].address,
      name: fan.user.profile.username,
    }));
    const { project } = event.queryStringParameters;
    const params = {
      FunctionName: `blast-${process.env.STAGE}-blastEmail`,
      Payload: JSON.stringify({
        contacts,
        subject,
        template,
        opts: { userId, projectId: project },
      }),
    };
    const res = await lambda.invoke(params).promise();
    const response = {
      statusCode: 200,
      body: JSON.stringify(res),
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

export const handleBlastSearchNotification = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { artistName, message } = JSON.parse(event.body);
    Object.assign(event.queryStringParameters, { hasNotification: true });
    const pipeline = doPipeline(userId, event.queryStringParameters || {});
    const results = await doSearch(pipeline, event.queryStringParameters || {});
    const endpoints = flatten(results.crowd.map(fan => fan.endpoints));
    const { project } = event.queryStringParameters;
    const params = {
      FunctionName: `blast-${process.env.STAGE}-blastNotification`,
      Payload: JSON.stringify({
        artistName,
        endpoints,
        message,
        opts: { userId, projectId: project },
      }),
    };
    const res = await lambda.invoke(params).promise();
    const response = {
      statusCode: 200,
      body: JSON.stringify(res),
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

export const handleBlastSearchText = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { message } = JSON.parse(event.body);
    Object.assign(event.queryStringParameters, { hasText: true });
    const pipeline = doPipeline(userId, event.queryStringParameters || {});
    const results = await doSearch(pipeline, event.queryStringParameters || {});
    const phones = results.crowd.map(fan => phone(fan.user.profile.phone)[0])
      .filter(phoneNumber => phoneNumber);
    const { project } = event.queryStringParameters;
    const params = {
      FunctionName: `blast-${process.env.STAGE}-blastText`,
      Payload: JSON.stringify({
        phones,
        message,
        opts: { userId, projectId: project },
      }),
    };
    const res = await lambda.invoke(params).promise();
    const response = {
      statusCode: 200,
      body: JSON.stringify(res),
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

export const handleSearch = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const pipeline = doPipeline(userId, event.queryStringParameters || {});
    Object.assign(event.queryStringParameters, { filterUserInfo: true });
    const results = await doSearch(pipeline, event.queryStringParameters ||
      { filterUserInfo: true });
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
