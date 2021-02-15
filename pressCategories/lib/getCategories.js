import MongoClient from '../../libs/mongoClient';

const { COLL_PICTURES, COLL_PRESS_CATEGORIES, DB_NAME } = process.env;

export default async (
  appId,
  showHidden = false,
  { start, limit, countOnly = false, fetchMaxOrder = false, parentId = false },
) => {
  const client = await MongoClient.connect();

  const matchHidden = showHidden
    ? { appId }
    : {
      appId,
      hidden: { $not: { $eq: true } },
    };
  if (parentId === null) {
    matchHidden.$or = [{ parentId: { $exists: false } }, { parentId: null }];
  } else if (parentId) {
    matchHidden.parentId = parentId;
  }

  try {
    if (countOnly) {
      const categoriesCount = await client
        .db(DB_NAME)
        .collection(COLL_PRESS_CATEGORIES)
        .find(matchHidden, { _id: 1 })
        .count();
      return { count: categoriesCount };
    }
    if (fetchMaxOrder) {
      matchHidden.order = { $ne: 999 };
      const categoriesCount = await client
        .db(DB_NAME)
        .collection(COLL_PRESS_CATEGORIES)
        .find(matchHidden, { _id: 1 })
        .count();

      return { count: categoriesCount };
    }

    start = parseInt(start, 10) || 0;
    limit = parseInt(limit, 10) || 10;

    const pipelineSkipLimit =
      limit > 0 ? [{ $skip: start }, { $limit: limit }] : [];

    const pipeline = [
      { $match: matchHidden },
      {
        $sort: {
          order: 1,
          createdAt: -1,
          name: 1,
        },
      },
      ...pipelineSkipLimit,
      {
        $lookup: {
          from: COLL_PICTURES,
          localField: 'picture',
          foreignField: '_id',
          as: 'picture',
        },
      },
      {
        $unwind: {
          path: '$pictures',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const categories = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .aggregate(pipeline)
      .toArray();
    const count = categories.length;

    return { categories, count };
  } finally {
    client.close();
  }
};
