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
            as: 'category',
          },
        },
        {
          $unwind: {
            path: '$category',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: (catPath ? { 'category.pathName': catPath } : { _id: { $exists: true } }),
        },
        {
          $sort: { createdAt: -1 },
        },
        { $limit: (parseInt(limit, 10) || 10) },
        { $skip: (parseInt(start, 10) || 0) },
      ])
      .toArray();
    return { articles };
  } finally {
    client.close();
  }
};
