import { MongoClient, ObjectId } from 'mongodb';
import winston from 'winston';

const selectionFields = [
  'banners',
  'content_IDs',
  'createAt',
  'date',
  'enableShop',
  'iconeThumbFileUrl',
  'isPublished',
  'isRoot',
  'isWebPublished',
  'limit',
  'onlyHighlighted',
  'overrideIcon',
  'selectionCollection',
  'selectionDisplayName',
  'selectionFindQuery',
  'selectionName',
  'selectionOptionQuery',
  'selectionRank',
  'updatedAt',
];

const doCheckSelectionsOwner = async (selectionIds, userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selections = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .find({ _id: { $in: selectionIds }, userId: { $ne: userId } })
      .count();
    return (selections === 0);
  } finally {
    client.close();
  }
};

const doGetSelection = async (selectionId, userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const [selections, userSubscriptions] = await Promise.all([
      client.db(process.env.DB_NAME)
        .collection(process.env.COLL_NAME)
        .aggregate([
          {
            $match: {
              _id: selectionId,
            },
          }, {
            $unwind: {
              path: '$selectionIds',
              preserveNullAndEmptyArrays: true,
            },
          }, {
            $lookup: {
              from: process.env.COLL_NAME,
              localField: 'selectionIds',
              foreignField: '_id',
              as: 'selections',
            },
          }, {
            $unwind: {
              path: '$selections',
              preserveNullAndEmptyArrays: true,
            },
          }, {
            $group:
              Object.assign({}, ...selectionFields.map(field => ({ [field]: { $first: `$${field}` } })), {
                _id: '$_id',
                selectionIds: { $push: '$selectionIds' },
                selections: { $push: '$selections' },
              }),
          },
        ]).toArray(),
      client.db(process.env.DB_NAME)
        .collection(process.env.USER_SUBS_COLL_NAME)
        .find({
          userId,
          expireAt: { $gt: new Date() },
        }, { projection: { subscriptionId: 1 } })
        .toArray(),
    ]);
    const selection = selections[0] || null;
    if (!selection) throw new Error('Not found');
    const userSubsriptionIds = userSubscriptions.map(item => item.subscriptionId);
    const onlyHighlighted = selection.onlyHighlighted === undefined || selection.onlyHighlighted;
    const selectionCollection = typeof selection.selectionCollection === 'string' ?
      [selection.selectionCollection] : selection.selectionCollection;

    const [isAudioSelection, isVideoSelection] = [selectionCollection.includes('audio'), selectionCollection.includes('video')];
    const selectionFindQuery = JSON.parse(selection.selectionFindQuery);
    selectionFindQuery.isPublished = true;

    const sort = JSON.parse(selection.selectionOptionQuery).sort || {};
    const trackSort = {};
    Object.keys(sort).forEach((key) => { trackSort[`track.${key}`] = sort[key]; });

    const audioPromise = isAudioSelection ?
      client.db(process.env.DB_NAME)
        .collection('audio')
        .find(
          selectionFindQuery,
          JSON.parse(selection.selectionOptionQuery),
        ).toArray() : [];
    const videoPromise = isVideoSelection ?
      client.db(process.env.DB_NAME)
        .collection('video')
        .find(
          selectionFindQuery,
          JSON.parse(selection.selectionOptionQuery),
        ).toArray() : [];
    const [audioTracks, videoTracks] = await Promise.all([audioPromise, videoPromise]);
    const rawTracks = audioTracks.concat(videoTracks);
    const projectIds = [...new Set(rawTracks.map(track => track.project_ID))];
    let projects;

    if (onlyHighlighted) {
      let aggregationPipeline = [{ $match: { _id: { $in: projectIds } } }];
      if (isAudioSelection) {
        aggregationPipeline = aggregationPipeline.concat([
          {
            $lookup: {
              from: 'audio',
              localField: '_id',
              foreignField: 'project_ID',
              as: 'audio',
            },
          },
          {
            $lookup: {
              from: 'audio',
              localField: 'highlight',
              foreignField: '_id',
              as: 'audioHighlight',
            },
          },
        ]);
      }
      if (isVideoSelection) {
        aggregationPipeline = aggregationPipeline.concat([
          {
            $lookup: {
              from: 'video',
              localField: '_id',
              foreignField: 'project_ID',
              as: 'video',
            },
          },
          {
            $lookup: {
              from: 'video',
              localField: 'highlight',
              foreignField: '_id',
              as: 'videoHighlight',
            },
          },
        ]);
      }
      aggregationPipeline = aggregationPipeline.concat([
        {
          $project: {
            iconeThumbFileUrl: true,
            track: {
              $concatArrays: [
                isAudioSelection ? '$audio' : [],
                isVideoSelection ? '$video' : [],
              ],
            },
            trackHighlight: {
              $concatArrays: [
                isAudioSelection ? '$audioHighlight' : [],
                isVideoSelection ? '$videoHighlight' : [],
              ],
            },
          },
        },
        {
          $unwind: {
            path: '$trackHighlight',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            iconeThumbFileUrl: true,
            track: {
              $ifNull: ['$trackHighlight', '$track'],
            },
          },
        },
        {
          $unwind: {
            path: '$track',
          },
        },
        {
          $sort: Object.keys(trackSort).length ? trackSort : { 'track.createdAt': -1 },
        },
        {
          $group: {
            _id: '$_id',
            projectThumbFileUrl: {
              $first: '$iconeThumbFileUrl',
            },
            track: {
              $first: '$track',
            },
          },
        },
        {
          $sort: Object.keys(trackSort).length ? trackSort : { 'track.createdAt': -1 },
        },
        {
          $limit: selection.limit || parseInt(process.env.DEFAULT_LIMIT, 10),
        },
      ]);
      const projectTracks = await client.db(process.env.DB_NAME).collection('Project')
        .aggregate(aggregationPipeline).toArray();
      selection.tracks = projectTracks.map(projectTrack => ({
        ...projectTrack.track,
        projectThumbFileUrl: projectTrack.projectThumbFileUrl,
      }));
    } else {
      projects = await client.db(process.env.DB_NAME).collection('Project').find(
        { _id: { $in: projectIds } },
        { projection: { iconeThumbFileUrl: true } },
      ).toArray();
      selection.tracks = rawTracks;
    }
    selection.tracks.forEach((track) => {
      if (projects) {
        const trackProject = projects.find(project => project._id === track.project_ID) || {};
        track.projectThumbFileUrl = trackProject.iconeThumbFileUrl || null;
      }
      track.isLocked = !!track.subscriptionIds &&
        !track.subscriptionIds.find(id => userSubsriptionIds.includes(id));
      if (track.isLocked) delete track.url;
    });
    return selection;
  } finally {
    client.close();
  }
};

const doGetSelections = async (type, web, mobile, root) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selector = {
      isPublished: true,
    };
    if (type && ['audio', 'video'].includes(type)) {
      selector.selectionCollection = type;
    }
    if (web === 'true') {
      selector.isWebPublished = true;
    }
    if (root === 'true') {
      selector.isRoot = true;
    }
    if (mobile !== 'false') {
      selector.isMobilePublished = { $ne: false };
    }
    const selections = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .find(selector)
      .sort({ selectionRank: 1 })
      .toArray();

    return { selections };
  } finally {
    client.close();
  }
};

const doGetUserSelections = async (userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selections = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .find({ userId })
      .toArray();

    return { selections };
  } finally {
    client.close();
  }
};

const doCreateUserSelection = async (name, userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selection = {
      _id: ObjectId().toString(),
      createAt: new Date(),
      date: 'Anytime',
      isPublished: true,
      isWebPublished: true,
      limit: 10,
      selectionCollection: [
        'audio',
        'video',
      ],
      selectionDisplayName: name,
      selectionFindQuery: '{"_id": {"$exists": false}}',
      selectionName: name,
      selectionOptionQuery: '{}',
      userId,
    };

    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .insertOne(selection);

    return true;
  } finally {
    client.close();
  }
};

const doDeleteUserSelection = async (selectionId, userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .deleteOne({ _id: selectionId, userId });

    return true;
  } finally {
    client.close();
  }
};

const doPatchUserSelection = async (selectionId, userId, contentIds, selectionIds, action = 'replace') => {
  if (selectionIds && selectionIds.length > 0) {
    const checked = await doCheckSelectionsOwner(selectionIds, userId);
    if (!checked) throw new Error('bad arguments');
  }
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    let modifier = {};
    const selection = (action !== 'replace') ?
      await client.db(process.env.DB_NAME)
        .collection(process.env.COLL_NAME)
        .findOne({ _id: selectionId, userId }) : null;
    const selectionFindQuery = (selection && JSON.parse(selection.selectionFindQuery)) ||
      { selectionFindQuery: { _id: { $in: [] } } };
    if (!selectionFindQuery._id) selectionFindQuery._id = { $in: [] };
    if (!selectionFindQuery._id.$in) selectionFindQuery._id.$in = [];
    delete selectionFindQuery._id.$exists;
    switch (action) {
      case 'remove': {
        if (contentIds) {
          selectionFindQuery._id.$in =
            selectionFindQuery._id.$in.filter(item => !contentIds.includes(item));
          modifier.selectionFindQuery = JSON.stringify(selectionFindQuery);
          modifier = { $set: modifier };
        }
        if (selectionIds) {
          modifier.$pull = {
            selectionIds: {
              $in: selectionIds,
            },
          };
        }
        break;
      }
      case 'add': {
        if (contentIds) {
          Array.prototype.push.apply(selectionFindQuery._id.$in, contentIds);
          selectionFindQuery._id.$in.filter = [...new Set(selectionFindQuery._id.$in)];
          modifier.selectionFindQuery = JSON.stringify(selectionFindQuery);
          modifier = { $set: modifier };
        }
        if (selectionIds) {
          modifier.$addToSet = {
            selectionIds: {
              $each: selectionIds,
            },
          };
        }
        break;
      }
      case 'replace':
      default: {
        if (contentIds) {
          modifier.selectionFindQuery = `{"_id": {"$in":["${contentIds.join('","')}"]}}`;
        }
        if (selectionIds) {
          modifier.selectionIds = selectionIds;
        }
        modifier = { $set: modifier };
      }
    }

    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .updateOne({ _id: selectionId, userId }, modifier);

    return true;
  } finally {
    client.close();
  }
};

export const handleGetSelection = async (event, context, callback) => {
  try {
    const selectionId = event.pathParameters.id;
    const userId = event.requestContext.authorizer.principalId;
    if (!selectionId) throw new Error('Missing id');
    const results = await doGetSelection(selectionId, userId);
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
    let statusCode = 500;
    if (e.message === 'Not found') {
      statusCode = 404;
    }
    winston.error(e);
    const response = {
      statusCode,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};

export const handleGetSelections = async (event, context, callback) => {
  try {
    const { type, web, mobile, root } = event.queryStringParameters || {};
    const results = await doGetSelections(type, web, mobile, root);
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
    const statusCode = 500;
    winston.error(e);
    const response = {
      statusCode,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};

export const handleGetUserSelections = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    const response = {
      statusCode: 403,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
    callback(null, response);
    return;
  }
  try {
    const results = await doGetUserSelections(userId);
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
    const statusCode = 500;
    winston.error(e);
    const response = {
      statusCode,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};

export const handlePostUserSelection = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    const response = {
      statusCode: 403,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
    callback(null, response);
    return;
  }
  try {
    const { name } = JSON.parse(event.body);
    if (!name) {
      throw new Error('malformed request');
    }
    const results = await doCreateUserSelection(name, userId);
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
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};

export const handleDeleteUserSelection = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    const response = {
      statusCode: 403,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
    callback(null, response);
    return;
  }
  try {
    const { selectionId } = event.pathParameters;
    const results = await doDeleteUserSelection(selectionId, userId);
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
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};

export const handlePatchUserSelection = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    const response = {
      statusCode: 403,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
    callback(null, response);
    return;
  }
  try {
    const { selectionId } = event.pathParameters;
    const { contentIds, selectionIds, action } = JSON.parse(event.body);
    if ((!contentIds && !selectionIds) || ![undefined, 'replace', 'remove', 'add'].includes(action)) {
      throw new Error('malformed request');
    }
    const results = await doPatchUserSelection(
      selectionId,
      userId,
      contentIds,
      selectionIds,
      action,
    );
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
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};
