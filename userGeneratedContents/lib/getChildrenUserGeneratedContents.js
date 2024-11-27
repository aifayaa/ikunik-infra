/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { getUGCCommentsCount } from './getUGCCounts';

const { COLL_USERS, COLL_USER_GENERATED_CONTENTS } = mongoCollections;

function buildPipeline({
  appId,
  parentId,
  parentCollection,
  fetchAll,
  start,
  limit,
}) {
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
      $project: {
        data: 1,
        parentCollection: 1,
        parentId: 1,
        rootParentCollection: 1,
        rootParentId: 1,
        reason: 1,
        reviewed: 1,
        moderated: 1,
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
    }
  );

  return pipeline;
}

export default async (
  appId,
  parentId,
  parentCollection,
  start,
  limit,
  children = false,
  fetchAll = false
) => {
  let client;
  try {
    client = await MongoClient.connect();

    const pipeline = buildPipeline({
      appId,
      parentId,
      parentCollection,
      fetchAll,
      start,
      limit,
    });

    const ugcs = await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .aggregate(pipeline)
      .toArray();

    const promises = ugcs.map(async (ugc) => {
      if (children) {
        ugc.commentsCount = await getUGCCommentsCount(appId, ugc._id);
      }
      if (children && ugc.commentsCount > 0) {
        const pipeline2 = buildPipeline({
          appId,
          parentId: ugc._id,
          parentCollection: COLL_USER_GENERATED_CONTENTS,
          fetchAll,
          start: 0,
          limit: 3,
        });
        ugc.comments = await client
          .db()
          .collection(COLL_USER_GENERATED_CONTENTS)
          .aggregate(pipeline2)
          .toArray();
      }
    });

    await Promise.all(promises);

    return ugcs;
  } finally {
    client.close();
  }
};
