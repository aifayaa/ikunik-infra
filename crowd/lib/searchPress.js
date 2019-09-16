import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PRESS_ARTICLES,
  COLL_USERS,
  COLL_USER_METRICS,
} = process.env;

export default async (
  appId,
  userId,
  {
    page = 1,
    limit = 20,
    articleId = '',
    sortBy = 'views',
    sortOrder = 'asc',
  },
) => {
  if (page && typeof page !== 'number') {
    page = parseInt(page, 10);
  }
  if (limit && typeof limit !== 'number') {
    limit = parseInt(limit, 10);
  }
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
  try {
    const $match = {
      appIds: {
        $elemMatch: { $eq: appId },
      },
      contentCollection: COLL_PRESS_ARTICLES,
      type: 'time',
      trashed: false,
    };

    if (articleId) {
      $match.contentId = articleId;
    }

    const pipeline = [
      {
        $match,
      },
      {
        $group: {
          _id: '$userId',
          user_ID: { $first: '$userId' },
          elapsedTime: { $sum: '$time' },
        },
      },
      {
        $lookup: {
          from: COLL_USERS,
          localField: 'user_ID',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          user_ID: 1,
          elapsedTime: 1,
          'user.profile.username': 1,
        },
      },
      {
        $sort: {
          [sortBy]: (sortOrder === 'asc' ? 1 : -1),
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          crowd: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          count: 1,
          crowd: { $slice: ['$crowd', (page - 1) * limit, limit] },
        },
      },
    ];

    const [result] = await client.db(DB_NAME)
      .collection(COLL_USER_METRICS)
      .aggregate(pipeline)
      .toArray();

    const { crowd, count } = result || { crowd: [], count: 0 };
    return { crowd, count };
  } finally {
    client.close();
  }
};

// {
//   "crowd": [
//     {
//       "_id": "B5npyCHsZdEyan6ZM",
//       "user_ID": "B5npyCHsZdEyan6ZM",
//       "elapsedTime": 1,
//       "user": {
//         "profile": {
//           "username": "Djothi"
//         }
//       },
//     },
//     {
//       "_id": "YwawYyTbNQFgmxqHB",
//       "user_ID": "YwawYyTbNQFgmxqHB",
//       "elapsedTime": 1,
//       "user": {
//         "profile": {
//           "username": "Ludovic Maillot"
//         }
//       },
//     }
//   ],
//   "count": 2
// }
