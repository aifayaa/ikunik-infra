import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PRESS_CATEGORIES,
  COLL_PICTURES,
} = process.env;

export default async (appId) => {
  let client;
  try {
    client = await MongoClient.connect();

    const pipeline = [
      {
        $match: {
          appIds: { $elemMatch: { $eq: appId } },
        },
      },
      {
        $sort: {
          name: -1,
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
