import { MongoClient } from 'mongodb';

export default async (catPath, start, limit, { onlyPublished = true }) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    const $match = (catPath ? {
      'category.pathName': catPath,
    } : {
      _id: {
        $exists: true,
      },
    });
    if (onlyPublished) { $match.isPublished = true; }

    const articles = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .aggregate([
        // TODO: optimise by using Category as start poitn
        // get Catgory Id with path and then get articles
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
        { $match },
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
