/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { getUGCArticleCommentsCount } from './getUGCCounts';

const {
  COLL_PICTURES,
  COLL_USERS,
  COLL_USER_GENERATED_CONTENTS,
  COLL_USER_GENERATED_CONTENTS_REPORTS,
} = mongoCollections;

export default async (
  appId,
  start,
  limit,
  type,
  userId,
  {
    countOnly = false,
    moderated = undefined,
    moderator,
    parentId,
    raw,
    reported = undefined,
    reportsCount = false,
    reviewed = undefined,
    sortBy,
    sortOrder = 'desc',
    trashed = false,
    ugcId = false,
  } = {}
) => {
  let client;
  try {
    client = await MongoClient.connect();

    /* Query objects */
    const $match = {
      trashed,
      appId,
    };

    /* Fill match object */
    if (userId) {
      $match.userId = userId;
    }
    if (ugcId) {
      $match._id = ugcId;
    }

    if (type) {
      $match.type = type;
    }

    if (parentId) {
      $match.rootParentId = parentId;
    }

    if (typeof reviewed !== 'undefined') {
      $match.reviewed = reviewed ? true : null;
    }

    if (typeof moderated !== 'undefined' && moderated === true) {
      $match.moderated = moderated;
      if ($match.reviewed === undefined) {
        $match.reviewed = true;
      }
    } else if (moderated === false) {
      $match.$or = [
        /* pre moderation case */
        { moderated: false, reviewed: true },
        /* post moderation cases */
        { moderated: { $exists: false }, reviewed: false },
        { moderated: { $exists: false }, reviewed: { $exists: false } },
      ];
    }
    if (!moderator) {
      $match.$or = [
        /* pre moderation case */
        { moderated: false, reviewed: true },
        /* post moderation cases */
        { moderated: { $exists: false }, reviewed: { $exists: false } },
      ];
    }

    /* Prepare pipeline */
    const pipeline = [{ $match }];
    const countPipeline = [{ $match }];

    if (reported || reportsCount) {
      const reportLookup = {
        $lookup: {
          from: COLL_USER_GENERATED_CONTENTS_REPORTS,
          localField: '_id',
          foreignField: 'ugcId',
          as: 'reports',
        },
      };
      pipeline.push(reportLookup);
      countPipeline.push(reportLookup);
    }

    if (typeof reported !== 'undefined') {
      let filterUgc;
      if (reported === 'true') {
        filterUgc = {
          $match: {
            reports: { $ne: [] },
          },
        };
      } else {
        filterUgc = {
          $match: {
            reports: [],
          },
        };
      }
      pipeline.push(filterUgc);
      countPipeline.push(filterUgc);
    }

    if (reportsCount) {
      const addReportsCount = {
        $addFields: {
          reportsCount: { $size: '$reports' },
        },
      };
      pipeline.push(addReportsCount);
    }

    /* add sort to pipeline only after added all fields */
    const $sort = {};
    if (sortBy) {
      $sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }
    $sort.createdAt = -1;
    pipeline.push({ $sort });

    /* Fill pipeline only when required */
    if (!countOnly) {
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
          $lookup: {
            from: COLL_PICTURES,
            localField: 'data.pictures',
            foreignField: '_id',
            as: 'pictures',
          },
        },
        {
          $project: {
            createdAt: 1,
            data: 1,
            parentCollection: 1,
            parentId: 1,
            reason: 1,
            reviewed: 1,
            moderated: 1,
            rootParentCollection: 1,
            rootParentId: 1,
            type: 1,
            reportsCount: 1,
            pictures: 1,
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
    }

    countPipeline.push({
      $count: 'total',
    });

    /* Prepare results */
    const resultsPromise = client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .aggregate(pipeline)
      .toArray();
    const countPromise = client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .aggregate(countPipeline)
      .toArray();

    let results = [];
    let total = 0;
    if (countOnly) {
      [{ total = 0 } = {}] = await countPromise;
    } else if (raw) {
      results = await resultsPromise;
    } else {
      [results = [], [{ total = 0 } = {}] = []] = await Promise.all([
        resultsPromise,
        countPromise,
      ]);
    }

    const promises = results.map(async (ugc) => {
      if (ugc && ugc.type === 'article') {
        ugc.commentsCount = await getUGCArticleCommentsCount(appId, ugc._id);
      }
    });

    await Promise.all(promises);

    return { items: results, totalCount: total };
  } finally {
    client.close();
  }
};
