import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { common as commonFields } from './articleFields';
import BadgeChecker from '../../libs/badges/BadgeChecker';

const { ADMIN_APP } = process.env;

const {
  COLL_EXTERNAL_PURCHASES,
  COLL_PICTURES,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  COLL_PRESS_DRAFTS,
  COLL_USERS,
  COLL_VIDEOS,
} = mongoCollections;

export const getArticles = async (
  categoryId,
  start,
  limit,
  appId,
  {
    checkBadges = true,
    getOrphansArticles = false,
    getPictures = false,
    noDateFilter = false,
    onlyPublished = true,
    reversedFlow = false,
    showHiddenOnFeed = false,
    showWithHiddenCategories = false,
    startDate = null,
    userId,
  },
) => {
  let client;
  const badgeChecker = new BadgeChecker(appId);
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
      .db()
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
      if (reversedFlow) {
        sortArticles = { pinned: -1, publicationDate: 1, createdAt: 1 };
        matchArticles.isPublished = true;
        if (!noDateFilter) {
          let from = startDate ? new Date(startDate) : new Date();
          if (!from.toJSON()) {
            from = new Date();
          }

          matchArticles.$or = [
            {
              publicationDate: {
                $exists: false,
              },
            },
            {
              publicationDate: {
                $gte: from,
              },
            },
          ];
        }
      } else {
        sortArticles = { pinned: -1, publicationDate: -1, createdAt: -1 };
        matchArticles.isPublished = true;
        if (!noDateFilter) {
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
      }
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
      client
        .db()
        .collection(COLL_PRESS_ARTICLES)
        .find(matchArticles)
        .count(),
    ]);

    let extPurchases = null;
    // Get drafts of articles
    if (articles.length > 0) {
      const articlesIds = articles.map((a) => (a._id));
      const draftPipeline = [
        {
          $match: {
            articleId: { $in: articlesIds },
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
      ];
      let drafts;
      [drafts, extPurchases] = await Promise.all([
        client
          .db()
          .collection(COLL_PRESS_DRAFTS)
          .aggregate(draftPipeline)
          .toArray(),
        userId
          ? client
            .db()
            .collection(COLL_EXTERNAL_PURCHASES)
            .find({
              appId,
              collection: COLL_PRESS_ARTICLES,
              userId,
              itemId: { $in: articlesIds },
            })
            .toArray()
          : [],
      ]);

      extPurchases = extPurchases.reduce((acc, itm) => {
        acc[itm.itemId] = itm;
        return (acc);
      }, {});

      const articlesMap = articles.reduce((acc, art) => {
        acc[art._id] = art;
        art.draft = null;
        return (acc);
      }, {});
      drafts.forEach((draft) => {
        articlesMap[draft.articleId].draft = draft;
      });
    }

    const articlesWithCategory = articles.map((article) => {
      const articleCategory = categories.find(
        (category) => category._id === article.categoryId,
      );
      if (articleCategory && articleCategory.forcedAuthor) {
        article.authorName = articleCategory.forcedAuthor;
      }
      return { ...article, category: articleCategory };
    });

    /** Permissions checks */
    const user = userId
      ? await client
        .db()
        .collection(COLL_USERS)
        .findOne({ _id: userId })
      : null;

    if (checkBadges && (!user || user.appId !== ADMIN_APP)) {
      const userBadges = (user && user.badges) || [];

      const articleRequires = (article, what, requiredElements) => {
        article.text = null;
        article.requires = what;
        article.requiredElements = requiredElements;
      };

      await badgeChecker.init;

      badgeChecker.registerBadges(userBadges.map(({ id: badgeId }) => (badgeId)));

      articlesWithCategory.forEach((article) => {
        if (article.badges) {
          const toRegister = article.badges.list.map(({ id: badgeId }) => (badgeId));
          badgeChecker.registerBadges(toRegister);
        }

        if (article.category) {
          if (article.category.badges) {
            const toRegister = article.category.badges.list.map(({ id: badgeId }) => (badgeId));
            badgeChecker.registerBadges(toRegister);
          }
        }
      });

      await badgeChecker.loadBadges();

      const promises = articlesWithCategory.map(async (article, id) => {
        if (!extPurchases[article._id]) {
          const opts = {
            appId,
            userId,
            articleId: article._id,
            categoryId: article.categoryId,
          };
          const categoryBadges = (article.category && article.category.badges) || { allow: 'any', list: [] };
          let checkerResults = await badgeChecker.checkBadges(
            userBadges,
            article.badges,
            opts,
          );
          checkerResults = checkerResults.merge(await badgeChecker.checkBadges(
            userBadges,
            categoryBadges,
            opts,
          ));

          articlesWithCategory[id].paidBadges = checkerResults.paidBadges;

          if (!checkerResults.canList) {
            articlesWithCategory[id] = null;
          } else if (!checkerResults.canRead) {
            articleRequires(articlesWithCategory[id], 'userBadges', checkerResults.restrictedBy);
          }
        }
      });

      await Promise.all(promises);
    }

    return { articles: articlesWithCategory, total };
  } finally {
    badgeChecker.close();
    client.close();
  }
};
