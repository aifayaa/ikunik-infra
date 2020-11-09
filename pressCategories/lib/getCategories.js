import MongoClient from '../../libs/mongoClient';

const { COLL_PICTURES, COLL_PRESS_CATEGORIES, DB_NAME } = process.env;

export default async (
  appId,
  showHidden = false,
  { start, limit, countOnly = false, isFetchMaxOrder = false },
) => {
  const client = await MongoClient.connect();

  const matchHidden = showHidden
    ? {
      $match: {
        appIds: appId,
      },
    }
    : {
      $match: {
        appIds: appId,
        hidden: { $not: { $eq: true } },
      },
    };

  try {
    if (countOnly) {
      const allCategories = await client
        .db(DB_NAME)
        .collection(COLL_PRESS_CATEGORIES)
        .aggregate([matchHidden])
        .toArray();

      return { count: allCategories.length };
    }
    if (isFetchMaxOrder) {
      const allCategories = await client
        .db(DB_NAME)
        .collection(COLL_PRESS_CATEGORIES)
        .aggregate([
          matchHidden,
          {
            $match: {
              order: { $ne: 999 },
            },
          },
        ])
        .toArray();

      return { count: allCategories.length };
    }

    const pipeline = [
      matchHidden,
      { $skip: parseInt(start, 10) || 0 },
      { $limit: parseInt(limit, 10) || 10 },
      {
        $sort: {
          order: 1,
          createdAt: -1,
          name: 1,
        },
      },
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
