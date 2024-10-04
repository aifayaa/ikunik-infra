/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { common as commonFields } from '../../pressArticles/lib/articleFields';

const pictureGroup = {
  ...Object.keys(commonFields).reduce(
    (res: { [key: string]: any }, key: string) => {
      res[key] = { $first: `$${key}` };
      return res;
    },
    {}
  ),
  category: { $first: '$category' },
  pictures: { $push: '$pictures' },
  _id: '$_id',
};

// Function to swap elements in the array
function swap(arr: Array<string>, i: number, j: number) {
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

// Function to find the possible permutations.
// Initial value of idx is 0.
function permutations(
  res: Array<Array<string>>,
  arr: Array<string>,
  idx: number
) {
  if (idx === arr.length) {
    res.push([...arr]);
    return;
  }

  for (let i = idx; i < arr.length; i += 1) {
    swap(arr, idx, i);
    permutations(res, arr, idx + 1);
    swap(arr, idx, i); // Backtracking
  }
}

// Function to get the permutations
function permute(arr: Array<string>) {
  const res: Array<Array<string>> = [];
  permutations(res, arr, 0);
  return res;
}

export default async (
  text: string,
  appId: string,
  {
    skip = 0,
    limit = 10,
    published = true,
    trashed = false,
    allFields = false,
  }: {
    skip?: number;
    limit?: number;
    published?: boolean | null;
    trashed?: boolean | null;
    allFields?: boolean | null;
  }
) => {
  const client = await MongoClient.connect();
  const { COLL_PRESS_ARTICLES } = mongoCollections;
  const collection = client.db().collection(COLL_PRESS_ARTICLES);

  try {
    const $match = {
      $text: { $search: text },
      appId,
      isPublished: true,
    } as {
      $text: { $search: string };
      appId: string;
      isPublished: boolean;
      trashed?: boolean;
      $or?: Array<{
        trashed?: { $exists?: boolean } | boolean;
        $exists?: boolean;
      }>;
    };

    if (typeof published === 'boolean') {
      $match.isPublished = published;
    }

    // Find only articles not trashed or trashed undefined
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

    // Run regex query on all permutations of the input text
    const textWords = text.split(' ');
    const textAllPermutations = permute(textWords);
    const textRegexQueries = textAllPermutations.map((permutation) => {
      return `.*${permutation.join('.*')}.*`;
    });
    const regexQueries = textRegexQueries
      .map((query) => {
        return [
          {
            regex: {
              query,
              path: 'title',
              score: { boost: { value: 3 } },
              allowAnalyzedField: true,
            },
          },
          {
            regex: {
              query,
              path: 'text',
              allowAnalyzedField: true,
            },
          },
        ];
      })
      .reduce((acc, val) => acc.concat(val), []);

    const fuzzyOptions = {
      maxEdits: 2,
      maxExpansions: 100,
    };

    const [results = {}] = await collection
      .aggregate([
        {
          $search: {
            index: 'diacritic-insensitive',
            compound: {
              must: [
                {
                  text: {
                    path: 'appId',
                    query: appId,
                  },
                },
                {
                  equals: {
                    path: 'isPublished',
                    value: true,
                  },
                },
              ],
              should: [
                {
                  text: {
                    query: text,
                    path: 'title',
                    score: { boost: { value: 3 } },
                    fuzzy: fuzzyOptions,
                  },
                },
                {
                  text: {
                    query: text,
                    path: 'text',
                    fuzzy: fuzzyOptions,
                  },
                },
                ...regexQueries,
              ],
              minimumShouldMatch: 1,
            },
            count: {
              type: 'total',
            },
          },
        },
        {
          $set: {
            searchScore: { $meta: 'searchScore' },
          },
        },
        {
          $lookup: {
            from: 'pressCategories',
            localField: 'categoryId',
            foreignField: '_id',
            pipeline: [
              {
                $match: {
                  'category.hidden': { $ne: true },
                },
              },
            ],
            as: 'category',
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
      items: results.articles || [],
    };
  } finally {
    client.close();
  }
};
