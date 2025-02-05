/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS, COLL_USER_GENERATED_CONTENTS_REPORTS } = mongoCollections;

export default async (
  appId,
  userGeneratedContentId,
  { start = 0, limit = 10, countOnly = false } = {}
) => {
  let client;
  try {
    client = await MongoClient.connect();

    /* Query objects */
    const $match = {
      ugcId: userGeneratedContentId,
      appId,
    };
    const $sort = { createdAt: -1 };

    /* Prepare pipelines */
    const pipeline = [{ $match }, { $sort }];
    const countPipeline = [{ $match }];

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
          $project: {
            createdAt: 1,
            details: 1,
            reason: 1,
            moderated: 1,
            user: {
              profile: 1,
              medals: 1,
              username: 1,
              _id: 1,
            },
          },
        }
      );
    }

    countPipeline.push({
      $count: 'count',
    });

    /* Prepare results */
    const resultsPromise = client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS_REPORTS)
      .aggregate(pipeline)
      .toArray();
    const countPromise = client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS_REPORTS)
      .aggregate(countPipeline)
      .toArray();

    const [results = [], [{ count = 0 } = {}] = []] = await Promise.all([
      countOnly ? null : resultsPromise,
      countPromise,
    ]);
    return { items: results, totalCount: count };
  } finally {
    client.close();
  }
};
