import MongoClient from '../../libs/mongoClient'

const {
  MONGO_URL,
  DB_NAME,
  COLL_USERS,
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

export default async (appId, start, limit, type, userId) => {
  let client;
  try {
    client = await MongoClient.connect();

    const $match = {};

    if (userId) {
      $match.userId = userId;
    }

    if (type) {
      $match.type = type;
    }

    $match.trashed = false;
    $match.appIds = { $elemMatch: { $eq: appId } };

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
      $project: {
        createdAt: 1,
        data: 1,
        parentCollection: 1,
        parentId: 1,
        rootParentCollection: 1,
        rootParentId: 1,
        type: 1,
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
      },
    });

    return await client
      .db(DB_NAME)
      .collection(COLL_USER_GENERATED_CONTENTS)
      .aggregate(pipeline)
      .toArray();
  } finally {
    client.close();
  }
};
