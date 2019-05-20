import { MongoClient } from 'mongodb';

export default async (userId, appId, { limit } = {}) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);

  try {
    limit = parseInt(limit, 10) || 20;
    const pipeline = [
      {
        $match: {
          userId,
          appIds: { $elemMatch: { $eq: appId } },
        },
      },
      {
        $sort: {
          date: -1,
        },
      },
      {
        $group: {
          _id: '$content_ID',
          content: { $first: '$$ROOT' },
        },
      },
      {
        $unwind: {
          path: '$content',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $replaceRoot: {
          newRoot: '$content',
        },
      },
      {
        $sort: {
          date: -1,
        },
      },
      { $limit: limit },
    ];
    const history = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_USER_HISTORY)
      .aggregate(pipeline)
      .toArray();
    return { history };
  } finally {
    client.close();
  }
};
