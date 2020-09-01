import MongoClient from '../../libs/mongoClient';

const {
  COLL_USERS,
  COLL_USER_GENERATED_CONTENTS,
  COLL_USER_GENERATED_CONTENTS_REPORTS,
  DB_NAME,
} = process.env;

export default async (
  appId,
  start,
  limit,
  type,
  userId,
  {
    countOnly = false,
    moderated = undefined,
    parentId,
    raw,
    reported = undefined,
    reportsCount = false,
    reviewed = undefined,
    trashed = false,
    sortBy,
    sortOrder = 'desc',
  } = {},
) => {
  let client;
  try {
    client = await MongoClient.connect();

    /* Query objects */
    const $match = {
      trashed,
      appIds: appId,
    };

    /* Fill match object */
    if (userId) {
      $match.userId = userId;
    }

    if (type) {
      $match.type = type;
    }

    if (parentId) {
      $match.rootParentId = parentId;
    }

    if (typeof moderated === 'undefined') {
      $match.$or = [
        { moderated: false },
        { moderated: { $exists: false } },
      ];
    } else {
      $match.moderated = moderated;
    }

    if (typeof reviewed !== 'undefined') {
      $match.reviewed = reviewed;
    }

    /* Prepare pipeline */
    const pipeline = [
      { $match },
    ];
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

    if (reported) {
      const filterUgc = {
        $match: {
          reports: { $ne: [] },
        },
      };
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
          reason: 1,
          reviewed: 1,
          rootParentCollection: 1,
          rootParentId: 1,
          type: 1,
          reportsCount: 1,
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
    }

    countPipeline.push({
      $count: 'total',
    });

    /* Prepare results */
    const resultsPromise = client
      .db(DB_NAME)
      .collection(COLL_USER_GENERATED_CONTENTS)
      .aggregate(pipeline)
      .toArray();
    const countPromise = client
      .db(DB_NAME)
      .collection(COLL_USER_GENERATED_CONTENTS)
      .aggregate(countPipeline)
      .toArray();

    let results = [];
    let total = 0;
    if (countOnly) {
      ([{ total = 0 } = {}] = await countPromise);
    } else if (raw) {
      (results = await resultsPromise);
    } else {
      ([results = [], [{ total = 0 } = {}] = []] = await Promise.all([
        resultsPromise,
        countPromise,
      ]));
    }

    return { items: results, totalCount: total };
  } finally {
    client.close();
  }
};
