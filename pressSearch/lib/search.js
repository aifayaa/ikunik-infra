/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { common as commonFields } from '../../pressArticles/lib/articleFields';

const pictureGroup = {
  ...Object.keys(commonFields).reduce((res, key) => {
    res[key] = { $first: `$${key}` };
    return res;
  }, {}),
  category: { $first: '$category' },
  pictures: { $push: '$pictures' },
  _id: '$_id',
};

export default async (
  text,
  appId,
  { skip = 0, limit = 10, published = true, trashed = false, allFields = false }
) => {
  const client = await MongoClient.connect();
  const { COLL_PRESS_ARTICLES } = mongoCollections;
  const collection = client.db().collection(COLL_PRESS_ARTICLES);

  try {
    const $match = {
      $text: { $search: text },
      appId,
      isPublished: true,
    };

    if (typeof published === 'boolean') {
      $match.isPublished = published;
    }

    /* Find only articles not trashed or trashed undefined */
    if (typeof trashed === 'boolean') {
      if (trashed) {
        $match.trashed = true;
      } else {
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
    }

    const filterFieldsPipeline = [];
    if (!allFields) {
      filterFieldsPipeline.push(
        {
          $unwind: {
            path: '$pictures',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: pictureGroup,
        }
      );
    }

    const [results = {}] = await collection
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
            preserveNullAndEmptyArrays: false,
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
        ...filterFieldsPipeline,
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

    return {
      total: results.total || 0,
      articles: results.articles || [],
    };
  } finally {
    client.close();
  }
};
