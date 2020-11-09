import MongoClient from '../../libs/mongoClient';
import articleFields from './articleFields.json';

const {
  COLL_PICTURES,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  COLL_USERS,
  COLL_VIDEOS,
  DB_NAME,
} = process.env;

export const getArticles = async (
  categoryId,
  start,
  limit,
  appId,
  {
    onlyPublished = true,
    getPictures = false,
    getOrphansArticles = false,
    showHidden = false,
  },
) => {
  let client;
  try {
    client = await MongoClient.connect();

    const categoriesMatch = {
      appIds: appId,
    };

    if (categoryId) {
      categoriesMatch._id = categoryId;
    }

    if (!showHidden) {
      categoriesMatch.hidden = { $ne: true };
    }

    const categories = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .find(categoriesMatch)
      .toArray();

    const categoriesIds = categories
      .filter(
        (category) => showHidden ||
          category.hidden === undefined ||
          category.hidden === showHidden,
      )
      .map((category) => category._id);
    const matchArticles = {
      appIds: appId,
      categoryId: getOrphansArticles
        ? { $ne: null }
        : { $in: categoriesIds },
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

    const sortArticles = { createdAt: -1 };
    /* If option is set, returns only published articles */
    if (onlyPublished) {
      sortArticles.publicationDate = -1;
      matchArticles.isPublished = true;
      matchArticles.$or = [
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

    let articlesPipeline = [
      { $match: matchArticles },
      { $sort: sortArticles },
      { $skip: parseInt(start, 10) || 0 },
      { $limit: parseInt(limit, 10) || 10 },
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
      {
        /*
          some users have base 64 pictures in profile,
          we remove those fields to avoid big trafic load
        */
        $project: {
          'user.profile.avatar': 0,
          'user.profile.userPictureData': 0,
          userTemp: 0,
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
        pictures: { $push: '$pictures' },
        videos: { $first: '$videos' },
        feedPicture: { $first: '$feedPicture' },
        _id: '$_id',
      };
      articlesPipeline = articlesPipeline.concat([
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
        pictures: { $first: '$pictures' },
        videos: { $push: '$videos' },
        feedPicture: { $first: '$feedPicture' },
        _id: '$_id',
      };
      articlesPipeline = articlesPipeline.concat([
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
    articlesPipeline.push({
      $sort: sortArticles,
    });


    const [articles = [], total = 0] = await Promise.all([
      client
        .db(DB_NAME)
        .collection(COLL_PRESS_ARTICLES)
        .aggregate(articlesPipeline)
        .toArray(),
      client
        .db(DB_NAME)
        .collection(COLL_PRESS_ARTICLES)
        .find(matchArticles)
        .count(),
    ]);

    const articlesWithCategory = articles.map((article) => {
      const articleCategory = categories.find(
        (category) => category._id === article.categoryId,
      );
      return { ...article, category: articleCategory };
    });


    return { articles: articlesWithCategory, total };
  } finally {
    client.close();
  }
};
