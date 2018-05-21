import { MongoClient } from 'mongodb';
import winston from 'winston';

const doGetSelection = async (selectionId, userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const [selection, userSubscriptions] = await Promise.all([
      client.db(process.env.DB_NAME)
        .collection(process.env.COLL_NAME)
        .findOne({ _id: selectionId }),
      client.db(process.env.DB_NAME)
        .collection(process.env.USER_SUBS_COLL_NAME)
        .find({
          userId,
          expireAt: { $gt: new Date() },
        }, { projection: { subscriptionId: 1 } })
        .toArray(),
    ]);
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
      ]);
      const projectTracks = await client.db(process.env.DB_NAME).collection('Project')
        .aggregate(aggregationPipeline).toArray();
      selection.tracks = projectTracks.map(projectTrack => ({
        ...projectTrack.track,
        isLocked: !!projectTrack.track.subscriptionIds &&
          !projectTrack.track.subscriptionIds.find(id => userSubsriptionIds.includes(id)),
        projectThumbFileUrl: projectTrack.projectThumbFileUrl,
      }));
    } else {
      const projects = await client.db(process.env.DB_NAME).collection('Project').find(
        { _id: { $in: projectIds } },
        { projection: { iconeThumbFileUrl: true } },
      ).toArray();
      rawTracks.forEach((track) => {
        const trackProject = projects.find(project => project._id === track.project_ID) || {};
        track.projectThumbFileUrl = trackProject.iconeThumbFileUrl || null;
        track.isLocked = !!track.subscriptionIds &&
          !track.subscriptionIds.find(id => userSubsriptionIds.includes(id));
      });
      selection.tracks = rawTracks;
    }

    if (!selection) throw new Error('Not found');
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
