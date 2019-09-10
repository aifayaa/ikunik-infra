import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_USERS,
  COLL_USER_METRICS,
} = process.env;

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
) => {
  let client;
  try {
    client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });

    const $match = {};

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

    if (latitude) {
      $match.type = latitude;
    }

    if (longitude) {
      $match.type = longitude;
    }

    $match.trashed = false;
    $match.appIds = { $elemMatch: { $eq: appId } };

    const $project = {
      _id: 1,
      appIds: 1,
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
          userPictureData: 1,
          username: 1,
        },
        status: 1,
        username: 1,
        _id: 1,
      },
    };

    const pipeline = [
      {
        $match,
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ];

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

    pipeline.push({
      $lookup: {
        from: COLL_USERS,
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    }, {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    }, {
      $project,
    });

    return await client
      .db(DB_NAME)
      .collection(COLL_USER_METRICS)
      .aggregate(pipeline)
      .toArray();
  } finally {
    client.close();
  }
};
