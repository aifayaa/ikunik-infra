/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS, COLL_USER_METRICS } = mongoCollections;

export default async (
  appId,
  userId,
  type,
  contentId,
  contentCollection,
  start,
  limit,
  startTime,
  endTime,
  latitude,
  longitude,
  range
) => {
  let client;
  try {
    client = await MongoClient.connect();

    const $match = {};
    let $geoNear = false;

    if (userId) {
      $match.userId = userId;
    }

    if (type) {
      $match.type = type;
    }

    if (contentId) {
      $match.contentId = contentId;
    }

    if (contentCollection) {
      $match.type = contentCollection;
    }

    if (startTime) {
      $match.type = startTime;
    }

    if (endTime) {
      $match.type = endTime;
    }

    if (latitude && longitude && range) {
      $geoNear = {
        near: {
          type: 'Point',
          coordinates: [latitude, longitude],
        },
        distanceField: 'result',
        includeLocs: 'location.loc',
        spherical: true,
        maxDistance: range | 0,
      };
    }

    $match.trashed = false;
    $match.appId = appId;

    const $project = {
      _id: 1,
      appId: 1,
      type: 1,
      contentId: 1,
      contentCollection: 1,
      trashed: 1,
      createdAt: 1,
      modifiedAt: 1,
      startTime: 1,
      endTime: 1,
      latitude: 1,
      longitude: 1,
      user: {
        firstname: 1,
        isUserPicture: 1,
        lastname: 1,
        profile: {
          avatar: 1,
          isUserPicture: 1,
          username: 1,
        },
        status: 1,
        username: 1,
        _id: 1,
      },
    };

    const pipeline = [];

    if ($geoNear) {
      pipeline.push({
        $geoNear,
      });
    }

    pipeline.push({
      $match,
    });

    pipeline.push({
      $sort: {
        createdAt: -1,
      },
    });

    if (start) {
      pipeline.push({
        $skip: Number(start),
      });
    }

    if (limit) {
      pipeline.push({
        $limit: Number(limit),
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: COLL_USERS,
          localField: 'userId',
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
        $project,
      }
    );

    return await client
      .db()
      .collection(COLL_USER_METRICS)
      .aggregate(pipeline)
      .toArray();
  } finally {
    client.close();
  }
};
