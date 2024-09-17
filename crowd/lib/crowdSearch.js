/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_DEVICES,
  COLL_PRESS_ARTICLES,
  COLL_PUSH_NOTIFICATIONS,
  COLL_USERS,
  COLL_USER_METRICS,
} = mongoCollections;

export default async (appId, searchOptions) => {
  const {
    sortBy = 'views',
    sortOrder = 'asc',
    countOnly = false,
    filterUserInfo = true,
    articleId = '',
    coordinates,
    range,
    search = '',
  } = searchOptions;
  let { limit = 20, page = 1 } = searchOptions;

  if (page && typeof page !== 'number') {
    page = parseInt(page, 10);
  }
  if (limit && typeof limit !== 'number') {
    limit = parseInt(limit, 10);
  }

  const pipeline = [];

  if (!coordinates) {
    const $match = {
      appId,
      contentCollection: COLL_PRESS_ARTICLES,
      type: 'time',
      trashed: false,
    };

    if (articleId) {
      $match.contentId = articleId;
    }

    pipeline.push(
      {
        $match,
      },
      {
        $group: {
          _id: {
            $ifNull: ['$userId', '$deviceId'],
          },
          user_ID: { $first: '$userId' },
          deviceId: { $first: '$deviceId' },
          elapsedTime: { $sum: '$time' },
        },
      },
      {
        $sort: {
          [sortBy]: sortOrder === 'asc' ? 1 : -1,
        },
      },
      ...(limit ? [{ $limit: limit }] : []),
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
      }
    );
  } else {
    const $matchOnUserMetrics = {
      appId,
      type: 'geolocation',
      trashed: false,
      $or: [
        {
          contentCollection: COLL_USERS,
        },
        {
          contentCollection: COLL_DEVICES,
        },
      ],
    };

    const $match = {
      $expr: {
        $or: [
          {
            $and: [
              {
                $eq: ['$userId', '$$foreignUserId'],
              },
              {
                $ne: ['$userId', null],
              },
              {
                contentCollection: COLL_USERS,
              },
            ],
          },
          {
            $and: [
              {
                $eq: ['$deviceId', '$$foreignDeviceId'],
              },
              {
                $ne: ['$deviceId', null],
              },
              {
                contentCollection: COLL_DEVICES,
              },
            ],
          },
        ],
      },
      appId,
      contentCollection: COLL_PRESS_ARTICLES,
      type: 'time',
      trashed: false,
    };

    if (articleId) {
      $match.contentId = articleId;
    }

    pipeline.push(
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: Object.values(JSON.parse(coordinates)).reverse(),
          },
          distanceField: 'result',
          includeLocs: 'location',
          spherical: true,
          maxDistance: range | 0,
        },
      },
      {
        $match: $matchOnUserMetrics,
      },
      {
        $lookup: {
          as: 'um',
          from: COLL_USER_METRICS,
          let: {
            foreignDeviceId: '$deviceId',
            foreignUserId: '$userId',
          },
          pipeline: [{ $match }],
        },
      },
      {
        $unwind: {
          path: '$um',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $replaceRoot: {
          newRoot: '$um',
        },
      },
      {
        $group: {
          _id: {
            $ifNull: ['$userId', '$deviceId'],
          },
          deviceId: { $first: '$deviceId' },
          elapsedTime: { $sum: '$time' },
          user_ID: { $first: '$userId' },
        },
      },
      {
        $sort: {
          [sortBy]: sortOrder === 'asc' ? 1 : -1,
        },
      },
      ...(limit ? [{ $limit: limit }] : []),
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
      }
    );
  }

  pipeline.push({
    $lookup: {
      from: COLL_PUSH_NOTIFICATIONS,
      let: {
        userId: '$user_ID',
        deviceId: '$deviceId',
      },
      pipeline: [
        {
          $match: {
            appId,
            $or: [
              {
                userId: { $ne: null },
                $expr: {
                  $eq: ['$userId', '$$userId'],
                },
              },
              {
                deviceId: { $ne: null },
                $expr: {
                  $eq: ['$deviceUUID', '$$deviceId'],
                },
              },
            ],
          },
        },
      ],
      as: 'endpoints',
    },
  });

  if (search) {
    pipeline.push({
      $match: {
        'user.profile.username': {
          $regex: new RegExp(search),
        },
      },
    });
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
        $group: {
          _id: null,
          count: { $sum: 1 },
          crowd: { $push: '$$ROOT' },
        },
      },
      {
        $project: project,
      }
    );

    // console.log(
    //   'DEBUG Query',
    //   {
    //     appId,
    //     limit,
    //     page,
    //     sortBy,
    //     sortOrder,
    //     countOnly,
    //     filterUserInfo,
    //   },
    //   JSON.stringify(pipeline, null, 2)
    // );

    const [result] = await client
      .db()
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
        .db()
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
        .db()
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
      const unique = (arrayOfArticles) =>
        arrayOfArticles
          .map((v) => v.title)
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((v) => ({ title: v }));

      crowd.forEach((value, key) => {
        const { deviceId, user_ID: userId } = value;
        if (userId) {
          crowd[key].lastGeolocation = {
            location: geolocationDataFormattedById[userId]
              ? geolocationDataFormattedById[userId].pop()
              : null,
          };
          crowd[key].userArticles = articleDataFormattedById[userId]
            ? unique(articleDataFormattedById[userId])
            : [];
        } else if (deviceId) {
          crowd[key].lastGeolocation = {
            location: geolocationDataFormattedByDevice[userId]
              ? geolocationDataFormattedByDevice[userId].pop()
              : null,
          };
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
