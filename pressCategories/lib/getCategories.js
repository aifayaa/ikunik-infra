import MongoClient from '../../libs/mongoClient';

const { COLL_PICTURES, COLL_PRESS_CATEGORIES, DB_NAME } = process.env;

export default async (appId, showHidden = false) => {
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
    const pipeline = [
      matchHidden,
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

    return { categories };
  } finally {
    client.close();
  }
};
