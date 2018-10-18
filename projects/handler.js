import { MongoClient } from 'mongodb';

const doGetProject = async (projectId, userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const db = client.db(process.env.DB_NAME);
    const [project, userSubscriptions] = await Promise.all([
      db.collection('Project').findOne({ _id: projectId }),
      db.collection('userSubscriptions')
        .find({
          userId,
          expireAt: { $gt: new Date() },
        }, { projection: { subscriptionId: 1 } })
        .toArray(),
    ]);
    const query = {
      project_ID: projectId,
      isPublished: true,
    };
    if (!project) throw new Error('Not found');
    const userSubsriptionIds = userSubscriptions.map(item => item.subscriptionId);
    const audioPromise = db.collection('audio').find(query).toArray();
    const videoPromise = db.collection('video').find(query).toArray();
    const [audioTracks, videoTracks] = await Promise.all([audioPromise, videoPromise]);
    const tracks = audioTracks.concat(videoTracks);

    tracks.forEach((track) => {
      track.projectThumbFileUrl = project.iconeThumbFileUrl || null;
      track.isLocked = !!track.subscriptionIds &&
        !track.subscriptionIds.find(id => userSubsriptionIds.includes(id));
      if (track.isLocked) delete track.url;
    });
    project.tracks = tracks;
    return project;
  } finally {
    client.close();
  }
};

const doGetUserProjects = async (userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const [{ projects }] = await client.db(process.env.DB_NAME).collection('profil')
      .aggregate([
        { $match: { UserId: userId } },
        {
          $lookup: {
            from: 'Project',
            localField: '_id',
            foreignField: 'profil_ID',
            as: 'projects',
          },
        },
        {
          $project: {
            _id: 0,
            projects: 1,
          },
        },
      ]).toArray();
    return { projects };
  } finally {
    client.close();
  }
};

export const handleGetProject = async (event, context, callback) => {
  try {
    const projectId = event.pathParameters.id;
    const userId = event.requestContext.authorizer.principalId;
    if (!projectId) throw new Error('Missing id');
    const results = await doGetProject(projectId, userId);
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
    const response = {
      statusCode,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};

export const handleGetUserProjects = async (event, context, callback) => {
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
    const results = await doGetUserProjects(userId);
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
