import { MongoClient } from 'mongodb';

export default async (catPath, start, limit) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    const articles = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .aggregate([
        {
          $lookup: {
            from: 'pressCategories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'pressCategories',
          },
        },
        {
          $unwind: {
            path: '$pressCategories',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: { 'pressCategories.pathName': catPath },
        },
        {
          $sort: { createdAt: -1 },
        },
        { $limit: (limit || 10) },
        { $skip: (start || 0) },
      ])
      .toArray();
    return { articles };
  } finally {
    client.close();
  }
};
