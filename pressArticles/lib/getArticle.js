import { MongoClient } from 'mongodb';
import articleFields from './articleFields.json';

const {
  COLL_PICTURES,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  COLL_USERS,
  DB_NAME,
  MONGO_URL,
} = process.env;

export const getArticle = async (
  id,
  appId,
  { getPictures = false, isServer = false, publishedOnly = false } = {},
) => {
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
  try {
    const $match = {
      _id: id,
      appIds: { $elemMatch: { $eq: appId } },
    };
    if (publishedOnly) $match.isPublished = true;
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
    ];
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
        feedPicture: { $first: '$feedPicture' },
        _id: '$_id',
      };
      pipeline = pipeline.concat([
        {
          $lookup: {
            from: COLL_PICTURES,
            localField: 'feedPictures',
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
            from: COLL_PICTURES,
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
    return articles[0] || null;
  } finally {
    client.close();
  }
};
