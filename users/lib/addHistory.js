import MongoClient, { ObjectID } from '../../libs/mongoClient';

export default async (userId, contentId, appId) => {
  const client = await MongoClient.connect();
  const db = client.db(process.env.DB_NAME);
  try {
    const pipeline = [
      {
        $match: {
          _id: contentId,
          appId,
        },
      },
      {
        $addFields: { content: '$$ROOT' },
      },
      {
        $lookup: {
          from: process.env.COLL_PROJECTS,
          localField: 'project_ID',
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
        $project: {
          _id: null,
          project_ID: '$project.id',
          artistName: '$project.artistName',
          albumName: '$project.albumName',
          iconeThumbFileUrl: '$project.iconeThumbFileUrl',
          collection: '$collection',
          content_ID: '$content._id',
          content: '$content',
          appIds: '$appIds',
          date: new Date(),
        },
      },
    ];
    const [[audioHistory], [videoHistory]] = await Promise.all([
      db.collection(process.env.COLL_AUDIOS).aggregate(pipeline).toArray(),
      db.collection(process.env.COLL_VIDEOS).aggregate(pipeline).toArray(),
    ]);
    const history = audioHistory || videoHistory;
    if (!history) {
      throw new Error('data not found');
    }
    history._id = ObjectID().toString();
    history.userId = userId;
    history.appIds = [appId];
    await db.collection(process.env.COLL_USER_HISTORY).insert(history);
    return true;
  } finally {
    client.close();
  }
};
