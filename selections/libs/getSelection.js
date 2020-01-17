import MongoClient from '../../libs/mongoClient'
import generateSignedURL from '../../libs/aws/generateSignedURL';
import queryReplace from './queryReplace';

const {
  COLL_AUDIOS,
  COLL_MEDIUM_SELECTION_LINKS,
  COLL_PICTURES,
  COLL_PROJECTS,
  COLL_SELECTIONS,
  COLL_USER_SUBSCRIPTIONS,
  COLL_VIDEOS,
  DB_NAME,
  DEFAULT_LIMIT,
  MONGO_URL,
} = process.env;

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

export default async (selectionId, userId, appId) => {
  const client = await MongoClient.connect();
  try {
    const [selections, userSubscriptions] = await Promise.all([
      client
        .db(DB_NAME)
        .collection(COLL_SELECTIONS)
        .aggregate([
          {
            $match: {
              _id: selectionId,
              appIds: { $elemMatch: { $eq: appId } },
            },
          },
          {
            $unwind: {
              path: '$selectionIds',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: COLL_SELECTIONS,
              localField: 'selectionIds',
              foreignField: '_id',
              as: 'selections',
            },
          },
          {
            $unwind: {
              path: '$selections',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: Object.assign(
              {},
              ...selectionFields.map(field => ({ [field]: { $first: `$${field}` } })),
              {
                _id: '$_id',
                selectionIds: { $push: '$selectionIds' },
                selections: { $push: '$selections' },
              },
            ),
          },
        ])
        .toArray(),
      userId ?
        client
          .db(DB_NAME)
          .collection(COLL_USER_SUBSCRIPTIONS)
          .find(
            {
              userId,
              expireAt: { $gt: new Date() },
            },
            { projection: { subscriptionId: 1 } },
          )
          .toArray() :
        [],
    ]);
    const selection = selections[0] || null;
    if (!selection) throw new Error('Not found');
    const userSubsriptionIds = userSubscriptions.map(item => item.subscriptionId);
    const onlyHighlighted = (selection.onlyHighlighted === undefined) ||
      (selection.onlyHighlighted === null) || selection.onlyHighlighted;
    const selectionCollection =
      typeof selection.selectionCollection === 'string'
        ? [selection.selectionCollection]
        : selection.selectionCollection;

    const [isAudioSelection, isVideoSelection] = [
      selectionCollection.includes('audio'),
      selectionCollection.includes('video'),
    ];
    const selectionFindQuery = JSON.parse(selection.selectionFindQuery);
    queryReplace(selectionFindQuery);
    if (selectionFindQuery) {
      selectionFindQuery.appIds = { $elemMatch: { $eq: appId } };
      selectionFindQuery.isPublished = true;
    }

    const sort = JSON.parse(selection.selectionOptionQuery).sort || {};
    const trackSort = {};
    Object.keys(sort).forEach((key) => {
      trackSort[`track.${key}`] = sort[key];
    });

    const audioPromise = (selection.selectionFindQuery && isAudioSelection)
      ? client
        .db(DB_NAME)
        .collection(COLL_AUDIOS)
        .aggregate([
          { $match: selectionFindQuery },
          {
            $lookup: {
              from: COLL_PICTURES,
              localField: 'pictureId',
              foreignField: '_id',
              as: 'picture',
            },
          },
          {
            $addFields: {
              picture: { $arrayElemAt: ['$picture', 0] },
            },
          },
          {
            $sort: Object.keys(sort).length ? sort : { createdAt: -1 },
          },
        ]).toArray()
      : [];
    const videoPromise = (selection.selectionFindQuery && isVideoSelection)
      ? client
        .db(DB_NAME)
        .collection(COLL_VIDEOS)
        .find(selectionFindQuery, JSON.parse(selection.selectionOptionQuery))
        .toArray()
      : [];

    const mediaChannelPromise = !selection.selectionFindQuery
      ? client
        .db(DB_NAME)
        .collection(COLL_MEDIUM_SELECTION_LINKS)
        .aggregate([
          {
            $match: { selectionId },
            appIds: { $elemMatch: { $eq: appId } },
          },
          {
            $lookup: {
              from: COLL_AUDIOS,
              localField: 'mediumId',
              foreignField: '_id',
              as: 'audio',
            },
          },
          {
            $lookup: {
              from: COLL_VIDEOS,
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
        ])
        .toArray()
      : [];

    const [audioTracks, videoTracks, mediaChannelTracks] = await Promise.all([
      audioPromise,
      videoPromise,
      mediaChannelPromise,
    ]);
    const rawTracks = audioTracks.concat(videoTracks, mediaChannelTracks);
    const projectIds = [...new Set(rawTracks.map(track => track.project_ID))];
    let projects;

    if (onlyHighlighted) {
      let aggregationPipeline = [{
        $match: {
          _id: { $in: projectIds },
          appIds: { $elemMatch: { $eq: appId } },
        },
      }];
      if (isAudioSelection) {
        aggregationPipeline = aggregationPipeline.concat([
          {
            $lookup: {
              from: COLL_AUDIOS,
              localField: '_id',
              foreignField: 'project_ID',
              as: 'audio',
            },
          },
          {
            $lookup: {
              from: COLL_AUDIOS,
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
              from: COLL_VIDEOS,
              localField: '_id',
              foreignField: 'project_ID',
              as: 'video',
            },
          },
          {
            $lookup: {
              from: COLL_VIDEOS,
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
            iconeMediumFileUrl: true,
            track: {
              $concatArrays: [isAudioSelection ? '$audio' : [], isVideoSelection ? '$video' : []],
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
            iconeMediumFileUrl: true,
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
          $lookup: {
            from: COLL_PICTURES,
            localField: 'pictureId',
            foreignField: '_id',
            as: 'picture',
          },
        },
        {
          $addFields: {
            picture: { $arrayElemAt: ['$picture', 0] },
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
            projectMediumFileUrl: {
              $first: '$iconeMediumFileUrl',
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
          $limit: selection.limit || parseInt(DEFAULT_LIMIT, 10),
        },
      ]);
      const projectTracks = await client
        .db(DB_NAME)
        .collection(COLL_PROJECTS)
        .aggregate(aggregationPipeline)
        .toArray();
      selection.tracks = projectTracks.map(projectTrack => ({
        ...projectTrack.track,
        projectThumbFileUrl: projectTrack.projectThumbFileUrl,
        projectMediumFileUrl: projectTrack.projectMediumFileUrl,
      }));
    } else {
      projects = await client
        .db(DB_NAME)
        .collection(COLL_PROJECTS)
        .find({
          _id: { $in: projectIds },
          appIds: { $elemMatch: { $eq: appId } },
        }, {
          projection: {
            iconeThumbFileUrl: true,
            iconeMediumFileUrl: true,
          },
        })
        .toArray();
      selection.tracks = rawTracks.slice(
        0,
        selection.limit || parseInt(DEFAULT_LIMIT, 10),
      );
    }
    selection.tracks.forEach((track) => {
      if (track.collection && track.filename && track.fileObj_ID && track.url) {
        track.url = generateSignedURL(`${track.collection === 'audio' ? 'MusicStorage' : 'VideoStorage'}/${track.fileObj_ID}-${track.filename}`);
      }
      if (projects) {
        const trackProject = projects.find(project => project._id === track.project_ID) || {};
        track.projectThumbFileUrl = trackProject.iconeThumbFileUrl || null;
        track.projectMediumFileUrl = trackProject.iconeMediumFileUrl || null;
      }
      track.isLocked =
        !!track.subscriptionIds &&
        !track.subscriptionIds.find(id => userSubsriptionIds.includes(id));
      if (track.isLocked) delete track.url;
    });
    return selection;
  } finally {
    client.close();
  }
};
