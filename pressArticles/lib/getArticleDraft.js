import { MongoClient } from 'mongodb';

const {
  COLL_PRESS_CATEGORIES,
  COLL_PRESS_DRAFTS,
  DB_NAME,
  MONGO_URL,
} = process.env;
export default async (articleId, appId) => {
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
  try {
    const articles = await client.db(DB_NAME)
      .collection(COLL_PRESS_DRAFTS)
      .aggregate([
        {
          $match: {
            articleId,
            appIds: { $elemMatch: { $eq: appId } },
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: COLL_PRESS_CATEGORIES,
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
