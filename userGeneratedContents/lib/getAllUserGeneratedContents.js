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
    reported = false,
  } = {},
) => {
  let client;
  try {
    client = await MongoClient.connect();

    /* Query objects */
    const $match = {};
    const $sort = { createdAt: -1 };

    /* Fill match object */
    if (userId) {
      $match.userId = userId;
    }

    if (type) {
      $match.type = type;
    }

    $match.trashed = false;
    $match.appIds = { $elemMatch: { $eq: appId } };

    /* Prepare pipeline */
    const pipeline = [
      { $match },
      { $sort },
    ];
    const countPipeline = [{ $match }];

    if (reported) {
      const reportLookup = {
        $lookup: {
          from: COLL_USER_GENERATED_CONTENTS_REPORTS,
          localField: '_id',
          foreignField: 'ugcId',
          as: 'report',
        },
      };
      const reportUnwind = {
        $unwind: {
          path: '$report',
          preserveNullAndEmptyArrays: false,
        },
      };
      pipeline.push(reportLookup, reportUnwind);
      countPipeline.push(reportLookup, reportUnwind);
    }

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
    }

    countPipeline.push({
      $group: {
        _id: null,
        total: { $sum: 1 },
      },
    }, {
      $project: {
        _id: 0,
        total: 1,
      },
    });

    /* Prepare results */
    let results = [];
    let total = [{ total: 0 }];
    if (countOnly) {
      total = await client
        .db(DB_NAME)
        .collection(COLL_USER_GENERATED_CONTENTS)
        .aggregate(countPipeline)
        .toArray();
    } else {
      ([results = [], total] = await Promise.all([
        client
          .db(DB_NAME)
          .collection(COLL_USER_GENERATED_CONTENTS)
          .aggregate(pipeline)
          .toArray(),
        client
          .db(DB_NAME)
          .collection(COLL_USER_GENERATED_CONTENTS)
          .aggregate(countPipeline)
          .toArray(),
      ]));
    }

    return { results, total: total[0].total };
  } finally {
    client.close();
  }
};
