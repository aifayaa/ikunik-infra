import { MongoClient } from 'mongodb';
import articleFields from './articleFields.json';

const {
  COLL_PICTURES,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  DB_NAME,
} = process.env;

export default async (id, appId, { getPictures = false, isServer = false }) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    let pipeline = [
      {
        $match: {
          _id: id,
          appIds: { $elemMatch: { $eq: appId } },
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
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (getPictures) {
      // Lookup on pictures
      const pictureGroup = {
        ...Object.keys(isServer ? articleFields.server : articleFields.public)
          .reduce((res, key) => {
            res[key] = { $first: `$${key}` };
            return res;
          }, {}),
        category: { $first: '$category' },
        pictures: { $push: '$pictures' },
        _id: '$_id',
      };
      pipeline = pipeline.concat([
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
    }

    const articles = await client.db(DB_NAME)
      .collection(COLL_PRESS_ARTICLES)
      .aggregate(pipeline)
      .toArray();
    return articles[0] || null;
  } finally {
    client.close();
  }
};
