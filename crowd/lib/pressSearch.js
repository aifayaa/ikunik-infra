import MongoClient from '../../libs/mongoClient';

const {
  COLL_PRESS_ARTICLES,
  COLL_USERS,
  COLL_USER_METRICS,
  DB_NAME,
} = process.env;

export default async (
  pipeline,
  appId,
  {
    limit = 20,
    page = 1,
    sortBy = 'views',
    sortOrder = 'asc',
    countOnly = false,
    filterUserInfo = true,
  },
) => {
  if (page && typeof page !== 'number') {
    page = parseInt(page, 10);
  }
  if (limit && typeof limit !== 'number') {
    limit = parseInt(limit, 10);
  }

  const client = await MongoClient.connect();
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

    /* If crowd results available, fetch more data to add to it */
    if (crowd && crowd.length) {
      const userIds = crowd
        .map((crowdUser) => crowdUser.user_ID)
        .filter((v) => v);
      const deviceIds = crowd
        .map((crowdUser) => !crowdUser.user_ID && crowdUser.deviceId)
        .filter((v) => v);

      const usersGeolocations = await client
        .db(DB_NAME)
        .collection(COLL_USER_METRICS)
        .aggregate([
          {
            $match: {
              appId,
              $or: [
                { userId: { $in: userIds } },
                { deviceId: { $in: deviceIds } },
              ],
              type: 'geolocation',
              trashed: false,
              contentCollection: COLL_USERS,
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $project: {
              _id: 1,
              deviceId: 1,
              location: 1,
              userId: 1,
            },
          },
        ])
        .toArray();

      const usersArticles = await client
        .db(DB_NAME)
        .collection(COLL_USER_METRICS)
        .aggregate([
          {
            $match: {
              appId,
              $or: [
                { userId: { $in: userIds } },
                { deviceId: { $in: deviceIds } },
              ],
              type: 'time',
              trashed: false,
              contentCollection: COLL_PRESS_ARTICLES,
            },
          },
          {
            $lookup: {
              from: COLL_PRESS_ARTICLES,
              localField: 'contentId',
              foreignField: '_id',
              as: 'articles',
            },
          },
          {
            $unwind: '$articles',
          },
          {
            $project: {
              _id: 1,
              deviceId: 1,
              location: 1,
              userId: 1,
              'articles.title': 1,
            },
          },
        ])
        .toArray();

      /* Format data into practical arrays */
      const geolocationDataFormattedByDevice = {};
      const geolocationDataFormattedById = {};

      usersGeolocations.forEach((value) => {
        const { deviceId, location, userId } = value;
        if (userId) {
          if (!geolocationDataFormattedById[userId]) {
            geolocationDataFormattedById[userId] = [];
          }
          geolocationDataFormattedById[userId].push(location);
        } else if (deviceId) {
          if (!geolocationDataFormattedByDevice[deviceId]) {
            geolocationDataFormattedByDevice[deviceId] = [];
          }
          geolocationDataFormattedByDevice[deviceId].push(location);
        }
      });

      const articleDataFormattedByDevice = {};
      const articleDataFormattedById = {};

      usersArticles.forEach((value) => {
        const { articles, deviceId, userId } = value;
        if (userId) {
          if (!articleDataFormattedById[userId]) {
            articleDataFormattedById[userId] = [];
          }
          articleDataFormattedById[userId].push(articles);
        } else if (deviceId) {
          if (!articleDataFormattedByDevice[deviceId]) {
            articleDataFormattedByDevice[deviceId] = [];
          }
          articleDataFormattedByDevice[deviceId].push(articles);
        }
      });

      /* Insert data to crowd results */
      const unique = (arrayOfArticles) => arrayOfArticles
        .map((v) => v.title)
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((v) => ({ title: v }));

      crowd.forEach((value, key) => {
        const { deviceId, user_ID: userId } = value;
        if (userId) {
          crowd[key].lastGeolocation = { location: geolocationDataFormattedById[userId]
            ? geolocationDataFormattedById[userId].pop()
            : null };
          crowd[key].userArticles = articleDataFormattedById[userId]
            ? unique(articleDataFormattedById[userId])
            : [];
        } else if (deviceId) {
          crowd[key].lastGeolocation = { location: geolocationDataFormattedByDevice[userId]
            ? geolocationDataFormattedByDevice[userId].pop()
            : null };
          crowd[key].userArticles = articleDataFormattedByDevice[deviceId]
            ? unique(articleDataFormattedByDevice[deviceId])
            : [];
        }
      });
    }

    return { crowd, count };
  } finally {
    client.close();
  }
};
