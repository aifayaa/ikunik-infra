import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (userId, contentId, appId) => {
  const client = await MongoClient.connect();
  const db = client.db();
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
          from: mongoCollections.COLL_PROJECTS,
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
          appId: '$appId',
          date: new Date(),
        },
      },
    ];
    const [[audioHistory], [videoHistory]] = await Promise.all([
      db.collection(mongoCollections.COLL_AUDIOS).aggregate(pipeline).toArray(),
      db.collection(mongoCollections.COLL_VIDEOS).aggregate(pipeline).toArray(),
    ]);
    const history = audioHistory || videoHistory;
    if (!history) {
      throw new Error('data not found');
    }
    history._id = ObjectID().toString();
    history.userId = userId;
    history.appId = appId;
    await db.collection(mongoCollections.COLL_USER_HISTORY).insert(history);
    return true;
  } finally {
    client.close();
  }
};
