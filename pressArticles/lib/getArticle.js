import MongoClient from '../../libs/mongoClient';
import articleFields from './articleFields.json';

const {
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
        ...Object.keys(isServer ? articleFields.server : articleFields.public).reduce(
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
        ...Object.keys(isServer ? articleFields.server : articleFields.public).reduce(
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
      /* Filter article if purchasable and not paid yet */
      if (
        article.storeProductId &&
        (!article.permissions || (!article.permissions.all && !article.permissions.read))
      ) {
        article.text = null;
      }
    }

    return article;
  } finally {
    client.close();
  }
};
