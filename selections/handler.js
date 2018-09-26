import { MongoClient, ObjectId } from 'mongodb';
import Lambda from 'aws-sdk/clients/lambda';
import winston from 'winston';
import doGetSelectionSubscriptions from './libs/doGetSelectionSubscriptions';
import { doLinkMediaToSelection, doUnlinkMediaFromSelection } from './libs/mediaSelections';
import { doDeleteUserSelectionTree } from './libs/doDeleteUserSelection';

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

const lambda = new Lambda({
  region: process.env.REGION,
});

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
    if (selectionFindQuery) selectionFindQuery.isPublished = true;

    const sort = JSON.parse(selection.selectionOptionQuery).sort || {};
    const trackSort = {};
    Object.keys(sort).forEach((key) => { trackSort[`track.${key}`] = sort[key]; });

    const audioPromise = selection.selectionFindQuery ? client.db(process.env.DB_NAME)
      .collection('audio')
      .find(
        selectionFindQuery,
        JSON.parse(selection.selectionOptionQuery),
      ).toArray() : [];
    const videoPromise = selection.selectionFindQuery ? client.db(process.env.DB_NAME)
      .collection('video')
      .find(
        selectionFindQuery,
        JSON.parse(selection.selectionOptionQuery),
      ).toArray() : [];

    const mediaChannelPromise = !selection.selectionFindQuery ? client.db(process.env.DB_NAME)
      .collection('mediumSelectionLinks')
      .aggregate([
        { $match: { selectionId } },
        {
          $lookup: {
            from: 'audio',
            localField: 'mediumId',
            foreignField: '_id',
            as: 'audio',
          },
        },
        {
          $lookup: {
            from: 'video',
            localField: 'mediumId',
            foreignField: '_id',
            as: 'video',
          },
        },
        {
          $unwind: {
            path: '$audio',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: '$video',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            medium: { $ifNull: ['$audio', '$video'] },
          },
        },
        {
          $unwind: {
            path: '$medium',
            preserveNullAndEmptyArrays: true,
          },
        },
        { $replaceRoot: { newRoot: '$medium' } },
      ]).toArray() : [];

    const [audioTracks, videoTracks, mediaChannelTracks] = await Promise.all([
      audioPromise, videoPromise, mediaChannelPromise,
    ]);
    const rawTracks = audioTracks.concat(videoTracks, mediaChannelTracks);
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

const doGetUserRootSelections = async (userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    let selections = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .find({ userId, selectionIds: { $exists: true } })
      .toArray();
    selections = selections.map(selection => selection.selectionIds);
    selections = [].concat(...selections);
    selections = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .find({ userId, _id: { $nin: selections } })
      .toArray();
    return { selections };
  } finally {
    client.close();
  }
};

const generatePatchUserSelection = async (selectionId, userId, contentIds, selectionIds, action = 'replace') => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    if (selectionIds && selectionIds.length > 0) {
      const checked = await doCheckSelectionsOwner(selectionIds, userId);
      if (!checked) throw new Error('bad selections arguments');
    }
    if (contentIds && contentIds.length > 0) {
      const params = {
        FunctionName: `media-${process.env.STAGE}-checkUserMedia`,
        Payload: JSON.stringify({ userId, mediaIds: contentIds }),
      };
      const { Payload } = await lambda.invoke(params).promise();
      const res = JSON.parse(Payload);
      if (res.statusCode !== 200) {
        throw new Error(`checkUserMedia handler failed: ${res.body}`);
      }
      if (res.body !== 'true') throw new Error('bad media arguments');
    }

    let modifier = {};
    const selection = (action !== 'replace') ?
      await client.db(process.env.DB_NAME)
        .collection(process.env.COLL_NAME)
        .findOne({ _id: selectionId, userId }) : null;
    const selectionFindQuery = (selection && selection.selectionFindQuery &&
      JSON.parse(selection.selectionFindQuery)) ||
      (selectionIds && { selectionFindQuery: { _id: { $in: [] } } });
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
    return modifier;
  } finally {
    client.close();
  }
};

const doPatchUserSelection = async (selectionId, userId, patch, noCheck) => {
  if (!noCheck) {
    const allowedOperations = ['$set'];
    const allowedFields = ['selectionName', 'isWebPublished', 'isMobilePublished'];
    Object.keys(patch).forEach(((key) => {
      if (!allowedOperations.includes(key)) {
        throw new Error('operation not allowed');
      }
      Object.keys(patch[key]).forEach((fKey) => {
        if (!allowedFields.includes(fKey)) {
          throw new Error('operation not allowed');
        }
      });
    }));
  }

  // modify selectionDisplayName with selectionName
  if (patch.$set.selectionName) patch.$set.selectionDisplayName = patch.$set.selectionName;

  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .updateOne({ _id: selectionId, userId }, patch);
    return await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne({ _id: selectionId, userId });
  } finally {
    client.close();
  }
};

const doCreateUserSelection = async (name, userId, parent) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const subscriptions = parent ? await doGetSelectionSubscriptions(parent, userId) : [{
      _id: ObjectId().toString(),
      userId,
      createAt: new Date(),
      price: null,
      name: null,
      duration: null,
      desc: null,
      banners: null,
    }];
    const selection = {
      _id: ObjectId().toString(),
      createAt: new Date(),
      date: 'Anytime',
      isPublished: false,
      isWebPublished: false,
      isMobilePublished: false,
      limit: 10,
      selectionCollection: [
        'audio',
        'video',
      ],
      selectionDisplayName: name,
      selectionName: name,
      selectionOptionQuery: '{}',
      userId,
      subscriptionIds: subscriptions.map(item => item._id),
    };
    if (parent) {
      const parentSelection = await client.db(process.env.DB_NAME)
        .collection(process.env.COLL_NAME)
        .findOne({ _id: parent }, { rootSelection: 1, subscriptionIds: 1, userId: 1 });
      if (!parentSelection) throw new Error('parent selection not exists');
      if (parentSelection.userId !== userId) throw new Error('parent selection is owned by an other user');
      selection.rootSelectionId = parentSelection.rootSelectionId || parent;
    }

    const [patch] = await Promise.all([
      parent ?
        generatePatchUserSelection(parent, userId, undefined, [selection._id], 'add')
        : client.db(process.env.DB_NAME).collection('subscriptions').insertMany(subscriptions),
      client.db(process.env.DB_NAME).collection(process.env.COLL_NAME).insertOne(selection),
    ]);
    if (parent) { await doPatchUserSelection(parent, userId, patch, true); }
    return selection;
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
  const { rootOnly } = event.queryStringParameters || {};
  if (userId !== urlId) {
    const response = {
      statusCode: 403,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
    callback(null, response);
    return;
  }
  try {
    let results;
    if (rootOnly) results = await doGetUserRootSelections(userId);
    else results = await doGetUserSelections(userId);
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
    const { name, parent } = JSON.parse(event.body);
    if (!name) {
      throw new Error('malformed request');
    }
    const results = await doCreateUserSelection(name, userId, parent);
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
    await doDeleteUserSelectionTree(userId, selectionId);
    const response = {
      statusCode: 200,
      body: JSON.stringify(true),
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
    const { contentIds,
      selectionIds,
      action,
      patch } = JSON.parse(event.body);
    if ((!contentIds && !selectionIds && !patch) || ![undefined, 'replace', 'remove', 'add', 'patch'].includes(action)) {
      throw new Error('malformed request');
    }
    let results;
    if (action === 'patch') {
      results = await doPatchUserSelection(
        selectionId,
        userId,
        patch,
      );
    } else {
      const modifier = await generatePatchUserSelection(
        selectionId,
        userId,
        contentIds,
        selectionIds,
        action,
      );
      results = await doPatchUserSelection(
        selectionId,
        userId,
        modifier,
        true,
      );
    }
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};

export const handleGetSelectionSubscriptions = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const selectionId = event.pathParameters.id;
  try {
    const subscriptions = await doGetSelectionSubscriptions(selectionId, userId);
    const response = {
      statusCode: 200,
      body: JSON.stringify({ subscriptions }),
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

export const handleLinkMediaToSelection = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const selectionId = event.pathParameters.id;
  try {
    const { mediaIds } = JSON.parse(event.body);
    const subscriptions = await doLinkMediaToSelection(userId, selectionId, mediaIds);
    const response = {
      statusCode: 200,
      body: JSON.stringify({ subscriptions }),
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

export const handleUnlinkMediaFromSelection = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const selectionId = event.pathParameters.id;
  try {
    const { mediaIds } = JSON.parse(event.body);
    await doUnlinkMediaFromSelection(userId, selectionId, mediaIds);
    const response = {
      statusCode: 200,
      body: JSON.stringify(true),
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
