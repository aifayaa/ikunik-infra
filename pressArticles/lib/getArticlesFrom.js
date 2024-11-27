/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { common as commonFields } from './articleFields';
import { getArticleCommentsCount } from './getArticleCounts';

const {
  COLL_PICTURES,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  COLL_PRESS_DRAFTS,
  COLL_USERS,
  COLL_VIDEOS,
} = mongoCollections;

export default async (
  categoryId,
  start,
  limit,
  from,
  sortBy,
  appId,
  {
    getAuthors = false,
    getDrafts = false,
    getOrphansArticles = false,
    getPictures = false,
    onlyPublished = true,
    showHiddenOnFeed = false,
    showWithHiddenCategories = false,
  }
) => {
  let client;
  try {
    client = await MongoClient.connect();

    const categoriesMatch = {
      appId,
    };

    if (categoryId) {
      showHiddenOnFeed = true;
      categoriesMatch._id = categoryId;
    }

    if (!showWithHiddenCategories) {
      categoriesMatch.hidden = { $ne: true };
    }

    const categories = await client
      .db()
      .collection(COLL_PRESS_CATEGORIES)
      .find(categoriesMatch)
      .toArray();

    const categoriesIds = categories
      .filter(
        (category) =>
          showWithHiddenCategories ||
          category.hidden === undefined ||
          category.hidden === showWithHiddenCategories
      )
      .map((category) => category._id);

    const matchArticles = {
      appId,
      /* Find only articles not trashed or trashed undefined */
      trashed: { $ne: true },
    };

    if (!showHiddenOnFeed) {
      matchArticles.hideFromFeed = { $ne: true };
    }

    if (getOrphansArticles) {
      matchArticles.$or = [
        { categoryId: null },
        { categoryId: { $in: categoriesIds } },
        { categoriesId: { $in: categoriesIds } },
      ];
    } else {
      matchArticles.$or = [
        { categoryId: { $in: categoriesIds } },
        { categoriesId: { $in: categoriesIds } },
      ];
    }

    const sortArticles = { [sortBy]: 1 };
    /* If option is set, returns only published articles */
    if (onlyPublished) {
      matchArticles.isPublished = true;
      matchArticles.publicationDate = { $gte: from };
    } else {
      matchArticles.createdAt = { $gte: from };
    }

    let articlesPipeline = [
      { $match: matchArticles },
      { $sort: sortArticles },
      { $skip: parseInt(start, 10) || 0 },
      { $limit: parseInt(limit, 10) || 10 },
    ];

    if (getAuthors) {
      articlesPipeline = articlesPipeline.concat([
        {
          $lookup: {
            from: COLL_PRESS_CATEGORIES,
            localField: 'categoriesId',
            foreignField: '_id',
            as: 'categories',
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
    }

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
    articlesPipeline.push({
      $sort: sortArticles,
    });

    const [articles = [], total = 0] = await Promise.all([
      client
        .db()
        .collection(COLL_PRESS_ARTICLES)
        .aggregate(articlesPipeline)
        .toArray(),
      client.db().collection(COLL_PRESS_ARTICLES).find(matchArticles).count(),
    ]);

    if (!getDrafts) {
      return { articles, total };
    }

    // Get drafts of articles
    let articlesWithDraft = articles;
    if (articles.length > 0) {
      // @TODO Group all articles ids to do a single query
      const getDraftsFor = async (article) => {
        const lastDraft = await client
          .db()
          .collection(COLL_PRESS_DRAFTS)
          .find({ articleId: article._id })
          .sort({ createdAt: -1 })
          .limit(1)
          .toArray();
        return { ...article, draft: lastDraft[0] || {} };
      };
      articlesWithDraft = await Promise.all(
        articles.map((article) => getDraftsFor(article))
      );
    }

    const articlesWithCategory = articlesWithDraft.map((article) => {
      const articleCategory = categories.find(
        (category) => category._id === article.categoryId
      );
      return { ...article, category: articleCategory };
    });

    const promises3 = articlesWithCategory.map(async (article) => {
      if (article) {
        article.commentsCount = await getArticleCommentsCount(
          appId,
          article._id
        );
      }
    });

    await Promise.all(promises3);

    return { articles: articlesWithCategory, total };
  } finally {
    client.close();
  }
};
