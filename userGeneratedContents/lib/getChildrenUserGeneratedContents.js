import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_USERS,
  COLL_USER_GENERATED_CONTENTS,
} = mongoCollections;

export default async (appId, parentId, parentCollection, start, limit, fetchAll = false) => {
  let client;
  try {
    client = await MongoClient.connect();

    const moderatedContentFilter = {
      $or: [
        /* pre moderation case */
        { moderated: false, reviewed: true },
        /* post moderation cases */
        { moderated: { $exists: false }, reviewed: { $exists: false } },
      ],
    };

    const pipeline = [
      {
        $match: {
          parentId,
          parentCollection,
          trashed: false,
          appId,
          ...(fetchAll ? {} : moderatedContentFilter),
        },
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
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .aggregate(pipeline)
      .toArray();
  } finally {
    client.close();
  }
};
