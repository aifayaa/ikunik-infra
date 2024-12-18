/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { common as commonFields } from './articleFields';

const {
  COLL_CONTENT_PERMISSIONS,
  COLL_PICTURES,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  COLL_USERS,
  COLL_VIDEOS,
} = mongoCollections;

export const getPurchasedArticles = async (
  appId,
  userId,
  {
    categoryId = null,
    deviceId = null,
    getPictures = true,
    limit,
    onlyPublished = true,
    start,
  }
) => {
  let client;
  try {
    client = await MongoClient.connect();

    const $match = {
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

    if (categoryId) {
      $match.$and.push({
        $or: [{ categoryId }, { categoriesId: categoryId }],
      });
    }

    let $sort = { createdAt: -1 };

    /* If option is set, returns only published articles */
    if (onlyPublished) {
      $sort = {
        publicationDate: -1,
        createdAt: -1,
      };
      $match.isPublished = true;
      $match.$and.push(
        {
          $or: [
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
          ],
        },
        {
          $or: [
            {
              unpublicationDate: null,
            },
            {
              unpublicationDate: {
                $gt: new Date(),
              },
            },
          ],
        }
      );
    }

    const userDeviceMatch = {};
    if (userId && deviceId) {
      userDeviceMatch.$or = [{ userId }, { deviceId, userId: null }];
    } else if (userId) {
      userDeviceMatch.userId = userId;
    } else if (deviceId) {
      userDeviceMatch.deviceId = deviceId;
      userDeviceMatch.userId = null;
    } else {
      throw new Error('missing_userid_and_deviceid');
    }

    let countPipeline = [
      {
        $match: {
          contentCollection: COLL_PRESS_ARTICLES,
          ...userDeviceMatch,
          $and: [
            {
              $or: [
                { expiresAt: { $eq: null } },
                { expiresAt: { $gt: new Date() } },
              ],
            },
            {
              $or: [{ 'permissions.read': true }, { 'permissions.all': true }],
            },
          ],
        },
      },
      {
        $lookup: {
          from: COLL_PRESS_ARTICLES,
          localField: 'contentId',
          foreignField: '_id',
          as: 'article',
        },
      },
      {
        $unwind: {
          path: '$article',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $replaceRoot: {
          newRoot: '$article',
        },
      },
      // TODO: optimise by using Category as start point
      // get Category Id with path and then get articles
      { $match },
    ];

    let pipeline = countPipeline.concat([
      { $sort },
      { $skip: parseInt(start, 10) || 0 },
      { $limit: parseInt(limit, 10) || 10 },
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
          from: COLL_PRESS_CATEGORIES,
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: false,
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
    ]);

    if (getPictures) {
      // Lookup on pictures
      // TODO optimise, fetch pictures only for skip/limit range
      const pictureGroup = {
        ...Object.keys(commonFields).reduce((res, key) => {
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
        ...Object.keys(commonFields).reduce((res, key) => {
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
    pipeline.push({ $sort });

    countPipeline = countPipeline.concat([{ $count: 'total' }]);

    const [articles = [], [{ total = 0 } = {}]] = await Promise.all([
      client
        .db()
        .collection(COLL_CONTENT_PERMISSIONS)
        .aggregate(pipeline)
        .toArray(),
      client
        .db()
        .collection(COLL_CONTENT_PERMISSIONS)
        .aggregate(countPipeline)
        .toArray(),
    ]);

    return { articles, total };
  } finally {
    client.close();
  }
};
