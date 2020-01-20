import MongoClient from '../../libs/mongoClient';
import articleFields from '../../pressArticles/lib/articleFields.json';

const pictureGroup = {
  ...Object.keys(articleFields.public).reduce((res, key) => {
    res[key] = { $first: `$${key}` };
    return res;
  }, {}),
  category: { $first: '$category' },
  pictures: { $push: '$pictures' },
  _id: '$_id',
};

const searchArticle = async (
  collection,
  text,
  appId,
  { skip = 0, limit = 10 },
  { keepEmptyCategory = false, noTrashed = true },
) => {
  const $match = {
    title: { $regex: new RegExp(text, 'gi') },
    appIds: { $elemMatch: { $eq: appId } },
    isPublished: true,
  };

  /* Find only articles not trashed or trashed undefined */
  if (noTrashed) {
    $match.$or = [
      {
        trashed: {
          $exists: false,
        },
      },
      {
        trashed: false,
      },
    ];
  }

  const results = await collection
    .aggregate([
      {
        $match,
      },
      {
        $sort: {
          createdAt: 1,
        },
      },
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
          preserveNullAndEmptyArrays: keepEmptyCategory,
        },
      },
      {
        $unwind: {
          path: '$pictures',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'pictures',
          localField: 'pictures',
          foreignField: '_id',
          as: 'pictures',
        },
      },
      {
        $unwind: {
          path: '$pictures',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: pictureGroup,
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          articles: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          articles: {
            $slice: ['$articles', skip, limit],
          },
        },
      },
    ])
    .toArray();

  return results;
};

export default async (text, appId, { skip, limit }) => {
  const client = await MongoClient.connect();
  const {
    DB_NAME,
    COLL_PRESS_ARTICLES,
  } = process.env;
  const collection = client.db(DB_NAME).collection(COLL_PRESS_ARTICLES);
  try {
    const [result = {}] = await searchArticle(collection, text, appId, { skip, limit }, {});
    return { articles: result.articles || [], total: result.total || 0 };
  } finally {
    client.close();
  }
};
