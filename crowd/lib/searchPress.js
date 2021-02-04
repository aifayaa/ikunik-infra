import MongoClient from '../../libs/mongoClient';

const { COLL_USER_METRICS, DB_NAME } = process.env;

export default async (
  pipeline,
  {
    limit = 20,
    page = 1,
    sortBy = 'views',
    sortOrder = 'asc',
    countOnly = false,
    filterUserInfo = true,
  },
) => {
  const client = await MongoClient.connect();

  if (page && typeof page !== 'number') {
    page = parseInt(page, 10);
  }
  if (limit && typeof limit !== 'number') {
    limit = parseInt(limit, 10);
  }

  try {
    if (filterUserInfo) {
      pipeline.push({
        $project: {
          _id: 1,
          user_ID: 1,
          deviceId: 1,
          elapsedTime: 1,
          'user.profile': 1,
          'user.emails': 1,
          'user.createdAt': 1,
          lastGeolocation: { $arrayElemAt: ['$userGeolocations', -1] },
          'userArticles.title': 1,
          hasEmail: {
            $cond: {
              if: {
                $or: [
                  { $ifNull: ['$user.email', false] },
                  { $ifNull: ['$user.profile.email', false] },
                  { $ifNull: ['$user.emails.0.address', false] },
                ],
              },
              then: true,
              else: false,
            },
          },
          hasPhone: {
            $cond: {
              if: {
                $or: [{ $ifNull: ['$user.profile.phone', false] }],
              },
              then: true,
              else: false,
            },
          },
          hasEndpoint: { $ne: ['$endpoints', []] },
        },
      });
    }

    const project = {
      count: 1,
    };
    if (countOnly !== 'true') {
      project.crowd = 1;
      if (limit !== 0) {
        project.crowd = { $slice: ['$crowd', (page - 1) * limit, limit] };
      }
    }

    pipeline.push(
      {
        $sort: {
          [sortBy]: sortOrder === 'asc' ? 1 : -1,
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
        $project: project,
      },
    );

    const [result] = await client
      .db(DB_NAME)
      .collection(COLL_USER_METRICS)
      .aggregate(pipeline)
      .toArray();

    const { crowd, count } = result || { crowd: [], count: 0 };
    return { crowd, count };
  } finally {
    client.close();
  }
};
