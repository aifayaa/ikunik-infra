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
        .find({ userId }, { projection: { subscriptionId: 1 } }).toArray(),
    ]);
    const userSubsriptionIds = userSubscriptions.map(item => item.subscriptionId);
    const onlyHighlighted = selection.onlyHighlighted === undefined || selection.onlyHighlighted;
    const selectionCollection = typeof selection.selectionCollection === 'string' ?
      [selection.selectionCollection] : selection.selectionCollection;

    const audioPromise = selectionCollection.includes('audio') ?
      client.db(process.env.DB_NAME)
        .collection('audio')
        .find(
          JSON.parse(selection.selectionFindQuery),
          JSON.parse(selection.selectionOptionQuery),
        ).toArray() : [];
    const videoPromise = selectionCollection.includes('video') ?
      client.db(process.env.DB_NAME)
        .collection('video')
        .find(
          JSON.parse(selection.selectionFindQuery),
          JSON.parse(selection.selectionOptionQuery),
        ).toArray() : [];
    const [audioTracks, videoTracks] = await Promise.all([audioPromise, videoPromise]);
    const rawTracks = audioTracks.concat(videoTracks);
    const projectIds = [...new Set(rawTracks.map(track => track.project_ID))];
    if (onlyHighlighted) {
      const projectTracks = await client.db(process.env.DB_NAME).collection('Project')
        .aggregate([
          { $match: { _id: { $in: projectIds } } },
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
              from: 'video',
              localField: '_id',
              foreignField: 'project_ID',
              as: 'video',
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
          {
            $lookup: {
              from: 'video',
              localField: 'highlight',
              foreignField: '_id',
              as: 'videoHighlight',
            },
          },
          {
            $project: {
              iconeThumbFileUrl: true,
              track: {
                $concatArrays: ['$audio', '$video'],
              },
              trackHighlight: {
                $concatArrays: ['$audioHighlight', '$videoHighlight'],
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
            $sort: JSON.parse(selection.selectionOptionQuery).sort.keys || { 'track.modifiedAt': 1 },
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
        ]).toArray();
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
