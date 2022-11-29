import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_PRESS_CATEGORIES,
  COLL_PRESS_DRAFTS,
  COLL_PURCHASABLE_PRODUCT,
} = mongoCollections;

export const getArticleDraft = async (articleId, appId) => {
  const client = await MongoClient.connect();
  try {
    const articles = await client.db()
      .collection(COLL_PRESS_DRAFTS)
      .aggregate([
        {
          $match: {
            articleId,
            appId,
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
        {
          $lookup: {
            from: COLL_PRESS_CATEGORIES,
            localField: 'categoriesId',
            foreignField: '_id',
            as: 'categories',
          },
        },
      ])
      .toArray();
    const article = articles[0];

    if (article.productId) {
      const product = await client.db()
        .collection(COLL_PURCHASABLE_PRODUCT)
        .findOne({
          _id: article.productId,
        });
      if (product) {
        article.price = product.price;
      }
    }

    return article || null;
  } finally {
    client.close();
  }
};
