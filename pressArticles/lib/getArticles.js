import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { common as commonFields } from './articleFields';
import BadgeChecker from '../../libs/badges/BadgeChecker';

const { ADMIN_APP } = process.env;

const {
  COLL_PICTURES,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  COLL_PRESS_DRAFTS,
  COLL_USERS,
  COLL_VIDEOS,
} = mongoCollections;

const getDraftLookupArray = (appId) => [
  {
    $lookup: {
      from: COLL_PRESS_DRAFTS,
      as: 'draft',
      let: {
        articleId: '$_id',
      },
      pipeline: [
        {
          $match: {
            appId,
            $expr: {
              /* Can probably add more expr in here to lighten the request more */
              $eq: ['$articleId', '$$articleId'],
            },
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $group: {
            _id: '$articleId',
            createdAt: { $first: '$createdAt' },
            title: { $first: '$title' },
          },
        },
      ],
    },
  },
  {
    $unwind: {
      path: '$draft',
      preserveNullAndEmptyArrays: true,
    },
  },
];

const getSortArticlesArray = (onlyPublished, admin) => {
  let $sort = { pinned: -1, createdAt: -1 };
  if (admin) {
    $sort = {
      pinned: -1,
      isPublished: 1,
      sortPublicationDate: -1,
      'draft.createdAt': -1,
    };
  } else if (onlyPublished) {
    $sort = { pinned: -1, publicationDate: -1 };
  }
  return [{ $sort }];
};

export const getArticles = async (
  categoryId,
  start,
  limit,
  appId,
  {
    admin = false,
    getPictures = false,
    checkBadges = true,
    getOrphansArticles = false,
    noDateFilter = false,
    onlyPublished = true,
    reversedSort = false,
    showHiddenOnFeed = false,
    showWithHiddenCategories = false,
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
      if (reversedSort) {
        sortArticles = { pinned: -1, publicationDate: 1 };
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
                $gte: new Date(),
              },
            },
          ];
        }
      } else {
        sortArticles = { pinned: -1, publicationDate: -1 };
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
      {
        $addFields: {
          sortPublicationDate: {
            $cond: {
              if: {
                $eq: ['$isPublished', true],
              },
              then: '$publicationDate',
              else: 0,
            },
          },
        },
      },
      ...getDraftLookupArray(appId),
      ...getSortArticlesArray(onlyPublished, admin),
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
    articlesPipeline.push(...getSortArticlesArray(onlyPublished, admin));

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

    // Get drafts of articles
    if (articles.length > 0) {
      const draftPipeline = [
        {
          $match: {
            articleId: { $in: articles.map((a) => (a._id)) },
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
      const drafts = await client
        .db()
        .collection(COLL_PRESS_DRAFTS)
        .aggregate(draftPipeline)
        .toArray();

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
        if (!checkerResults.canList) {
          articlesWithCategory[id] = null;
        } else if (!checkerResults.canRead) {
          articleRequires(articlesWithCategory[id], 'userBadges', checkerResults.restrictedBy);
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
