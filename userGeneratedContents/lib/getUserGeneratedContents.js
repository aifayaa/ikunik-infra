/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { getUGCArticleCommentsCount } from './getUGCCounts';

const { COLL_USERS, COLL_USER_GENERATED_CONTENTS } = mongoCollections;

export default async (
  appId,
  userGeneratedContentsId,
  { moderator = undefined, trashed = undefined } = {}
) => {
  let client;
  try {
    client = await MongoClient.connect();

    const $match = {
      _id: userGeneratedContentsId,
      appId,
    };

    if (moderator) {
      if (typeof trashed !== 'undefined') {
        $match.trashed = trashed;
      }
    } else {
      $match.trashed = false;
    }

    const $project = {
      createdAt: 1,
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
    };

    if (moderator) {
      $project.trashed = true;
    }

    const pipeline = [
      { $match },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ];
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

    const ugcs = await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .aggregate(pipeline)
      .toArray();

    const promises = ugcs.map(async (ugc) => {
      if (ugc && ugc.type === 'article') {
        ugc.commentsCount = await getUGCArticleCommentsCount(appId, ugc._id);
      }
    });

    await Promise.all(promises);

    return ugcs;
  } finally {
    client.close();
  }
};
