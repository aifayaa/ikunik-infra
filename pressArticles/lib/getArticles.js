import { MongoClient } from 'mongodb';
import articleFields from './articleFields.json';

const {
  COLL_PICTURES,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  COLL_USERS,
  COLL_VIDEOS,
  DB_NAME,
  MONGO_URL,
} = process.env;

export const getArticles = async (
  categoryId,
  start,
  limit,
  appId,
  { onlyPublished = true, getPictures = false, noCategory = false },
) => {
  let client;
  try {
    client = await MongoClient.connect(MONGO_URL, {
      useNewUrlParser: true,
    });

    const $match = categoryId
      ? {
        'category._id': categoryId,
      }
      : {
        _id: { $exists: true },
      };

    /* If option is set, returns only published articles */
    if (onlyPublished) {
      $match.isPublished = true;
      $match.$or = [
        {
          publicationDate: {
            $exists: false,
          },
        },
        {
          publicationDate: {
            $lte: new Date(),
          },
        },
      ];
    }

    let pipeline = [
      // TODO: optimise by using Category as start poitn
      // get Catgory Id with path and then get articles
      {
        $match: {
          appIds: { $elemMatch: { $eq: appId } },
          /* Find only articles not trashed or trashed undefined */
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
        },
      },
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
          preserveNullAndEmptyArrays: noCategory,
        },
      },
      {
        $lookup: {
          from: COLL_USERS,
          localField: 'userId',
          foreignField: '_id',
          as: 'userTemp',
        },
      },
      {
        $unwind: {
          path: '$userTemp',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          user: {
            profile: '$userTemp.profile',
            username: '$userTemp.username',
          },
        },
      },
      { $match },
    ];

    if (getPictures) {
      // Lookup on pictures
      // TODO optimise, fetch pictures only for skip/limit range
      const pictureGroup = {
        ...Object.keys(articleFields.public).reduce((res, key) => {
          res[key] = { $first: `$${key}` };
          return res;
        }, {}),
        category: { $first: '$category' },
        pictures: { $push: '$pictures' },
        videos: { $first: '$videos' },
        feedPicture: { $first: '$feedPicture' },
        _id: '$_id',
      };
      pipeline = pipeline.concat([
        {
          $lookup: {
            from: COLL_PICTURES,
            localField: 'feedPictures',
            foreignField: '_id',
            as: 'feedPicture',
          },
        },
        {
          $unwind: {
            path: '$feedPicture',
            preserveNullAndEmptyArrays: true,
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
            from: COLL_PICTURES,
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
      ]);

      // Lookup on videos
      // TODO optimise, fetch videos only for skip/limit range
      const videoGroup = {
        ...Object.keys(articleFields.public).reduce((res, key) => {
          res[key] = { $first: `$${key}` };
          return res;
        }, {}),
        category: { $first: '$category' },
        pictures: { $first: '$pictures' },
        videos: { $push: '$videos' },
        _id: '$_id',
      };
      pipeline = pipeline.concat([
        {
          $unwind: {
            path: '$videos',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: COLL_VIDEOS,
            localField: 'videos',
            foreignField: '_id',
            as: 'videos',
          },
        },
        {
          $unwind: {
            path: '$videos',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: videoGroup,
        },
      ]);
    }

    pipeline = pipeline.concat([
      {
        $sort: { createdAt: -1 },
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
            $slice: [
              '$articles',
              parseInt(start, 10) || 0,
              parseInt(limit, 10) || 10,
            ],
          },
        },
      },
    ]);

    const [result = {}] = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .aggregate(pipeline)
      .toArray();

    const { articles = [], total = 0 } = result;
    return { articles, total };
  } finally {
    client.close();
  }
};
