/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { common, admin, server } from './articleFields';
import BadgeChecker from '../../libs/badges/BadgeChecker';
import { getArticleCommentsCount } from './getArticleCounts';

const { ADMIN_APP } = process.env;

const {
  COLL_APPS,
  COLL_CONTENT_PERMISSIONS,
  COLL_EXTERNAL_PURCHASES,
  COLL_PICTURES,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  COLL_USERS,
  COLL_USER_BADGES,
  COLL_VIDEOS,
} = mongoCollections;

export const getArticle = async (
  id,
  appId,
  {
    deviceId = null,
    getPictures = false,
    isServer = false,
    publishedOnly = false,
    userId = null,
  } = {}
) => {
  const options = {
    articleFields: common,
  };
  if (!publishedOnly) {
    options.articleFields = admin;
  }
  if (isServer) {
    options.articleFields = server;
  }
  const client = await MongoClient.connect();
  const badgeChecker = new BadgeChecker(appId);
  try {
    const $match = {
      _id: id,
      appId,
    };

    if (publishedOnly) {
      $match.isPublished = true;
    }

    let pipeline = [
      { $match },
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
          preserveNullAndEmptyArrays: true,
        },
      },
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
    ];

    if (userId || deviceId) {
      const iapLookupUserPipeline = {};
      if (userId && deviceId) {
        iapLookupUserPipeline.$or = [
          { $eq: ['$userId', userId] },
          { $eq: ['$deviceId', deviceId] },
        ];
      } else if (userId) {
        iapLookupUserPipeline.$eq = ['$userId', userId];
      } else if (deviceId) {
        iapLookupUserPipeline.$eq = ['$deviceId', deviceId];
      }

      pipeline = pipeline.concat([
        {
          $lookup: {
            as: 'cp',
            from: COLL_CONTENT_PERMISSIONS,
            let: {
              articleId: '$_id',
              articleProductId: '$productId',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $ne: ['$$articleProductId', null] },
                      { $eq: ['$contentId', '$$articleId'] },
                      { $eq: ['$contentCollection', COLL_PRESS_ARTICLES] },
                      iapLookupUserPipeline,
                    ],
                  },
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: '$cp',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: { permissions: '$cp.permissions' },
        },
      ]);
    }

    if (getPictures) {
      // Lookup on pictures
      const pictureGroup = {
        ...Object.keys(options.articleFields).reduce((res, key) => {
          res[key] = { $first: `$${key}` };
          return res;
        }, {}),
        badges: { $first: '$badges' },
        category: { $first: '$category' },
        categories: { $first: '$categories' },
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

      // Lookup on pictures
      const videoGroup = {
        ...Object.keys(options.articleFields).reduce((res, key) => {
          res[key] = { $first: `$${key}` };
          return res;
        }, {}),
        badges: { $first: '$badges' },
        category: { $first: '$category' },
        categories: { $first: '$categories' },
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

    const articles = await client
      .db()
      .collection(COLL_PRESS_ARTICLES)
      .aggregate(pipeline)
      .toArray();

    const article = articles[0] || null;

    if (article) {
      if (article.categories) {
        article.categories.forEach(({ forcedAuthor }) => {
          if (forcedAuthor) {
            article.authorName = forcedAuthor;
          }
        });
      }

      const app = await client
        .db()
        .collection(COLL_APPS)
        .findOne(
          { _id: appId },
          {
            projection: {
              'settings.press.articles.previewLength': 1,
            },
          }
        );

      let previewLength = 180;
      if (
        app &&
        app.settings &&
        app.settings.press &&
        app.settings.press.articles &&
        app.settings.press.articles.previewLength
      ) {
        previewLength = app.settings.press.articles.previewLength;
      }

      const articleRequires = (
        what,
        requiredElements,
        { preview = false } = {}
      ) => {
        if (preview && article.text) {
          article.text = article.text.substr(0, previewLength);
        } else {
          article.text = null;
        }
        article.isPreview = preview;
        article.requires = what;
        article.requiredElements = requiredElements;
      };

      if (userId) {
        const extPurchases = await client
          .db()
          .collection(COLL_EXTERNAL_PURCHASES)
          .findOne({
            appId,
            collection: COLL_PRESS_ARTICLES,
            userId,
            itemId: article._id,
          });

        if (extPurchases) {
          return article;
        }
      }

      /* Filter article if purchasable and not paid yet */
      const cp = article.permissions;
      if (article.storeProductId && (!cp || (!cp.all && !cp.read))) {
        articleRequires('iap');
      }

      const user = userId
        ? await client.db().collection(COLL_USERS).findOne({ _id: userId })
        : null;

      if (!isServer && (!user || user.appId !== ADMIN_APP || deviceId)) {
        const userBadges = [...((user && user.badges) || [])];
        if (deviceId) {
          const allIAPBadges = await await client
            .db()
            .collection(COLL_USER_BADGES)
            .find({
              appId,
              storeProductId: { $ne: null },
            })
            .toArray();
          const iapBadgesIds = allIAPBadges.map(({ _id }) => _id);

          if (iapBadgesIds.length > 0) {
            const purchasedBadges = await client
              .db()
              .collection(COLL_CONTENT_PERMISSIONS)
              .find({
                deviceId,
                contentId: { $in: iapBadgesIds },
                contentCollection: COLL_USER_BADGES,
                $or: [
                  { 'permissions.all': true },
                  { 'permissions.read': true },
                ],
              })
              .toArray();

            purchasedBadges.forEach((purchase) => {
              userBadges.push({
                id: purchase.contentId,
                status: 'assigned',
              });
            });
          }
        }

        await badgeChecker.init;

        badgeChecker.registerBadges(
          userBadges.map(({ id: badgeId }) => badgeId)
        );
        if (article.badges) {
          badgeChecker.registerBadges(
            article.badges.list.map(({ id: badgeId }) => badgeId)
          );
        }

        const { categories = [article.category] } = article;
        const categoriesBadges =
          (categories &&
            categories.reduce((acc, category) => {
              if (category && category.badges) {
                const list = category.badges.list.map((badge) => badge.id);
                badgeChecker.registerBadges(list);
                acc.push(category.badges);
              }
              return acc;
            }, [])) ||
          [];
        await badgeChecker.loadBadges();

        const opts = {
          appId,
          userId,
          articleId: id,
          categoriesId: (article.categoriesId || []).join(','),
          categoryId: article.categoryId,
        };
        let checkerResults = await badgeChecker.checkBadges(
          userBadges,
          article.badges,
          opts
        );
        const promises = categoriesBadges.map(async (categoryBadges) => {
          checkerResults = checkerResults.merge(
            await badgeChecker.checkBadges(userBadges, categoryBadges, opts)
          );
        });
        await Promise.all(promises);
        article.paidBadges = checkerResults.paidBadges;
        if (!checkerResults.canList) {
          throw new Error('forbidden');
        }
        if (!checkerResults.canRead) {
          articleRequires('userBadges', checkerResults.restrictedBy, {
            preview: checkerResults.canPreview,
          });
        }
      }
    }

    article.commentsCount = await getArticleCommentsCount(appId, article._id);

    return article;
  } finally {
    badgeChecker.close();
    client.close();
  }
};
