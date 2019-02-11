import { MongoClient } from 'mongodb';

export default async (articleId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    const articles = await client.db(process.env.DB_NAME)
      .collection('pressDrafts')
      .aggregate([
        { $match: { articleId } },
        { $sort: { createdAt: -1 } },
        { $limit: 1 },
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
      ])
      .toArray();
    return articles[0] || null;
  } finally {
    client.close();
  }
};
