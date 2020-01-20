import MongoClient from '../../libs/mongoClient';

const {
  COLL_AUDIOS,
  COLL_VIDEOS,
  COLL_USER_SUBSCRIPTIONS,
  COLL_PROJECTS,
  DB_NAME,
} = process.env;

export default async (projectId, userId, appId) => {
  const client = await MongoClient.connect();
  try {
    const db = client.db(DB_NAME);
    const [project, userSubscriptions] = await Promise.all([
      db.collection(COLL_PROJECTS).findOne({ _id: projectId }),
      db.collection(COLL_USER_SUBSCRIPTIONS)
        .find({
          userId,
          appIds: { $elemMatch: { $eq: appId } },
          expireAt: { $gt: new Date() },
        }, { projection: { subscriptionId: 1 } })
        .toArray(),
    ]);
    const query = {
      project_ID: projectId,
      appIds: { $elemMatch: { $eq: appId } },
      isPublished: true,
    };
    if (!project) throw new Error('Not found');
    const userSubsriptionIds = userSubscriptions.map((item) => item.subscriptionId);
    const audioPromise = db.collection(COLL_AUDIOS).find(query).toArray();
    const videoPromise = db.collection(COLL_VIDEOS).find(query).toArray();
    const [audioTracks, videoTracks] = await Promise.all([audioPromise, videoPromise]);
    const tracks = audioTracks.concat(videoTracks);

    tracks.forEach((track) => {
      track.projectThumbFileUrl = project.iconeThumbFileUrl || null;
      track.isLocked = !!track.subscriptionIds
        && !track.subscriptionIds.find((id) => userSubsriptionIds.includes(id));
      if (track.isLocked) delete track.url;
    });
    project.tracks = tracks;
    return project;
  } finally {
    client.close();
  }
};
