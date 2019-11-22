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

    const $match = {
      appIds: { $elemMatch: { $eq: appId } },
      categoryId: categoryId || { $exists: true },
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
    };

    let $sort = { createdAt: -1 };

    /* If option is set, returns only published articles */
    if (onlyPublished) {
      $sort = {
        publicationDate: -1,
        createdAt: -1,
      };
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
      // TODO: optimise by using Category as start point
      // get Catgory Id with path and then get articles
      { $match },
      { $sort },
      { $skip: parseInt(start, 10) || 0 },
      { $limit: parseInt(limit, 10) || 10 },
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
      { /*
          some users have base 64 pictures in profile,
          we remove those fields to avoid big trafic load
        */
        $project: {
          'user.profile.avatar': 0,
          'user.profile.userPictureData': 0,
        },
      },
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
            localField: 'feedPicture',
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
        feedPicture: { $first: '$feedPicture' },
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

    /* Group stage could break sorting, ensure all is well sorted */
    pipeline = pipeline.push({ $sort });

    const [articles = [], total = 0] = await Promise.all([
      client
        .db(DB_NAME)
        .collection(COLL_PRESS_ARTICLES)
        .aggregate(pipeline)
        .toArray(),
      client
        .db(DB_NAME)
        .collection(COLL_PRESS_ARTICLES)
        .find($match)
        .count(),
    ]);

    return { articles, total };
  } finally {
    client.close();
  }
};
