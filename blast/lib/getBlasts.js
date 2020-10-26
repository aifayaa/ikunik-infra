import MongoClient from '../../libs/mongoClient';

const {
  COLL_BLASTS,
  DB_NAME,
} = process.env;

export default async (userId, appId, {
  limit, skip, sortBy, sortOrder, type,
} = {}) => {
  const client = await MongoClient.connect();
  try {
    const selector = {
      fromUser_ID: userId,
      appIds: appId,
    };
    let sort = {};

    if (type) selector.type = type;
    limit = parseInt(limit, 10) || 10;
    skip = parseInt(skip, 10) || 0;
    if (sortBy && sortOrder) sort = { [sortBy]: (sortOrder === 'desc' ? 1 : -1) };

    const [record] = await client.db(DB_NAME).collection(COLL_BLASTS)
      .aggregate([
        { $match: selector },
        { $sort: sort },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            blasts: { $push: '$$ROOT' },
          },
        },
        {
          $project: {
            _id: 0,
            totalCount: 1,
            blasts: { $slice: ['$blasts', skip, limit] },
          },
        },
      ]).toArray();
    return record || { blasts: [], totalCount: 0 };
  } finally {
    client.close();
  }
};
