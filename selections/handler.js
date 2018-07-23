import { MongoClient } from 'mongodb';
import winston from 'winston';

const selectionFields = [
  'banners',
  'content_IDs',
  'createAt',
  'date',
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
    let selector = {
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
