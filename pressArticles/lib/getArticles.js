import { MongoClient } from 'mongodb';
import articleFields from './articleFields.json';

export default async (catPath, start, limit, { onlyPublished = true, getPictures = false }) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    const $match = (catPath ? {
      'category.pathName': catPath,
    } : {
      _id: {
        $exists: true,
      },
    });
    if (onlyPublished) { $match.isPublished = true; }

    let pipeline = [
      // TODO: optimise by using Category as start poitn
      // get Catgory Id with path and then get articles
      {
        $lookup: {
          from: 'pressCategories',
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
      { $match },
    ];

    if (getPictures) {
      // Lookup on pictures
      const pictureGroup = {
        ...Object.keys(articleFields.public).reduce((res, key) => {
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
            from: 'pictures',
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

    pipeline = pipeline.concat([
      {
        $sort: { createdAt: -1 },
      },
      { $limit: (parseInt(limit, 10) || 10) },
      { $skip: (parseInt(start, 10) || 0) },
    ]);
    const articles = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .aggregate(pipeline)
      .toArray();
    return { articles };
  } finally {
    client.close();
  }
};
