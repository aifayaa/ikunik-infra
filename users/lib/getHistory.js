/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (userId, appId, { limit } = {}) => {
  const client = await MongoClient.connect();

  try {
    limit = parseInt(limit, 10) || 20;
    const pipeline = [
      {
        $match: {
          userId,
          appId,
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
    const history = await client
      .db()
      .collection(mongoCollections.COLL_USER_HISTORY)
      .aggregate(pipeline)
      .toArray();
    return { history };
  } finally {
    client.close();
  }
};
