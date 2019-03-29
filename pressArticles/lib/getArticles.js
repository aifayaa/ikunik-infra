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
      // TODO optimise, fetch pictures only for skip/limit range
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
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          articles: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          articles: {
            $slice: [
              '$articles',
              (parseInt(start, 10) || 0),
              (parseInt(limit, 10) || 10),
            ],
          },
        },
      },
    ]);

    const [result = {}] = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .aggregate(pipeline)
      .toArray();

    const { articles = [], total = 0 } = result;
    return { articles, total };
  } finally {
    client.close();
  }
};
