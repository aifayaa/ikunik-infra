import MongoClient from '../../libs/mongoClient';
import {
  common,
  admin,
  server,
} from './articleFields';
import checkBadges from './checks/checkBadges';

const {
  ADMIN_APP,
  COLL_CONTENT_PERMISSIONS,
  COLL_PICTURES,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  COLL_USERS,
  COLL_VIDEOS,
  DB_NAME,
} = process.env;

export const getArticle = async (
  id,
  appId,
  {
    getPictures = false,
    isServer = false,
    publishedOnly = false,
    userId = null,
  } = {},
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

    if (userId) {
      pipeline = pipeline.concat([
        {
          $lookup: {
            as: 'cp',
            from: COLL_CONTENT_PERMISSIONS,
            let: {
              articleId: '$_id',
              articleProductId: '$productId',
            },
            pipeline: [{ $match: {
              $expr: {
                $and: [
                  { $ne: ['$$articleProductId', null] },
                  { $eq: ['$contentId', '$$articleId'] },
                  { $eq: ['$contentCollection', COLL_PRESS_ARTICLES] },
                  { $eq: ['$userId', userId] },
                ],
              },
            } }],
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
        ...Object.keys(options.articleFields).reduce(
          (res, key) => {
            res[key] = { $first: `$${key}` };
            return res;
          },
          {},
        ),
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

      // Lookup on pictures
      const videoGroup = {
        ...Object.keys(options.articleFields).reduce(
          (res, key) => {
            res[key] = { $first: `$${key}` };
            return res;
          },
          {},
        ),
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

    const articles = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .aggregate(pipeline)
      .toArray();

    const article = articles[0] || null;

    if (article) {
      const articleRequires = (what) => {
        article.text = null;
        article.requires = what;
      };

      /* Filter article if purchasable and not paid yet */
      const cp = article.permissions;
      if (
        article.storeProductId &&
        (!cp || (!cp.all && !cp.read))
      ) {
        articleRequires('iap');
      }

      const user = userId
        ? await client
          .db(DB_NAME)
          .collection(COLL_USERS)
          .findOne({ _id: userId })
        : null;

      if (!user || user.appId !== ADMIN_APP) {
        const userBadges = user ? user.badges : [];

        const opts = {
          appId,
          userId,
          articleId: id,
          categoryId: article.categoryId,
        };
        if (!checkBadges(userBadges, article.badges, opts)) {
          articleRequires('userBadges');
        } else if (!checkBadges(userBadges, (article.category && article.category.badges), opts)) {
          articleRequires('userBadges');
        }
      }
    }

    return article;
  } finally {
    client.close();
  }
};
