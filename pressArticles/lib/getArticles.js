import MongoClient from '../../libs/mongoClient';
import { common as commonFields } from './articleFields';

const {
  COLL_PICTURES,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  COLL_PRESS_DRAFTS,
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
    admin = false,
    getOrphansArticles = false,
    getPictures = false,
    onlyPublished = true,
    showHiddenOnFeed = false,
    showWithHiddenCategories = false,
  },
) => {
  let client;
  try {
    client = await MongoClient.connect();

    const categoriesMatch = {
      appId,
    };

    if (categoryId) {
      showHiddenOnFeed = true;
    }

    if (categoryId) {
      categoriesMatch._id = categoryId;
    }

    if (!showWithHiddenCategories) {
      categoriesMatch.hidden = { $ne: true };
    }

    const categories = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .find(categoriesMatch)
      .toArray();

    const categoriesIds = categories
      .filter(
        (category) => showWithHiddenCategories ||
          category.hidden === undefined ||
          category.hidden === showWithHiddenCategories,
      )
      .map((category) => category._id);

    const matchArticles = {
      appId,
      /* Find only articles not trashed or trashed undefined */
      $and: [
        {
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
      ],
    };

    if (!showHiddenOnFeed) {
      matchArticles.$and.push({
        $or: [
          {
            hideFromFeed: {
              $exists: false,
            },
          },
          {
            hideFromFeed: false,
          },
        ],
      });
    }

    if (getOrphansArticles) {
      matchArticles.$or = [
        { categoryId: null },
        { categoryId: { $in: categoriesIds } },
      ];
    } else {
      matchArticles.categoryId = { $in: categoriesIds };
    }

    let sortArticles = { pinned: -1, createdAt: -1 };
    /* If option is set, returns only published articles */
    if (onlyPublished) {
      sortArticles = { pinned: -1, publicationDate: -1 };
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

    let articlesPipeline = [{ $match: matchArticles }];

    if (admin) {
      articlesPipeline.push(...[
        {
          $addFields: {
            sortPublicationDate: {
              $cond: {
                if: {
                  $eq: ['isPublished', true],
                },
                then: '$publicationDate',
                else: 0,
              },
            },
          },
        },
        {
          $sort: {
            pinned: -1,
            isPublished: 1,
            sortPublicationDate: -1,
            createdAt: -1,
          },
        },
      ]);
    } else {
      articlesPipeline.push({
        $sort: sortArticles,
      });
    }

    articlesPipeline.push(...[
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
    ]);

    if (getPictures) {
      // Lookup on pictures
      // TODO optimise, fetch pictures only for skip/limit range
      const pictureGroup = {
        ...Object.keys(commonFields).reduce((res, key) => {
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
        ...Object.keys(commonFields).reduce((res, key) => {
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
    if (admin) {
      articlesPipeline.push({
        $sort: {
          pinned: -1,
          isPublished: 1,
          sortPublicationDate: -1,
          createdAt: -1,
        },
      });
    } else {
      articlesPipeline.push({
        $sort: sortArticles,
      });
    }

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

    // Get drafts of articles
    let articlesWithDraft = articles;
    if (articles.length > 0) {
      // @TODO Group all articles ids to do a single query
      const getDrafts = async (article) => {
        const lastDraft = await client
          .db(DB_NAME)
          .collection(COLL_PRESS_DRAFTS)
          .find({ articleId: article._id })
          .sort({ createdAt: -1 })
          .limit(1)
          .toArray();
        return { ...article, draft: lastDraft[0] || {} };
      };
      articlesWithDraft = await Promise.all(
        articles.map((article) => getDrafts(article)),
      );
    }

    const articlesWithCategory = articlesWithDraft.map((article) => {
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
