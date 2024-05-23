/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import { common as commonFields } from '../../pressArticles/lib/articleFields';

// Taken from https://stackoverflow.com/a/6969486
function escapeRegex(str) {
  const escapedStr = str
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/ /g, '.*');
  return new RegExp(escapedStr, 'i');
}

const pictureGroup = {
  ...Object.keys(commonFields).reduce((res, key) => {
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
  { keepEmptyCategory = false, noTrashed = true }
) => {
  const escaped = escapeRegex(text);
  const $match = {
    appId,
    isPublished: true,
    $and: [
      {
        $or: [{ title: { $regex: escaped } }, { md: { $regex: escaped } }],
      },
    ],
  };

  /* Find only articles not trashed or trashed undefined */
  if (noTrashed) {
    $match.$and.push({
      $or: [
        {
          trashed: {
            $exists: false,
          },
        },
        {
          trashed: false,
        },
      ],
    });
  }

  const results = await collection
    .aggregate([
      {
        $match,
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
        $match: {
          'category.hidden': { $ne: true },
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
        $sort: {
          publicationDate: -1,
        },
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
  const { COLL_PRESS_ARTICLES } = mongoCollections;
  const collection = client.db().collection(COLL_PRESS_ARTICLES);
  try {
    const [result = {}] = await searchArticle(
      collection,
      text,
      appId,
      { skip, limit },
      {}
    );
    return { articles: result.articles || [], total: result.total || 0 };
  } finally {
    client.close();
  }
};
