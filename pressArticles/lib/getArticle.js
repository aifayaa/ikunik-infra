import { MongoClient } from 'mongodb';

export default async (id) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    const articles = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .aggregate([
        { $match: { _id: id } },
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
      ])
      .toArray();
    return articles[0] || null;
  } finally {
    client.close();
  }
};
