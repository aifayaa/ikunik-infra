import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_METRICS } = mongoCollections;

export default async (appId, { month, year }) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const [{ count = 0 } = {}] = await client
      .db()
      .collection(COLL_USER_METRICS)
      .aggregate([
        {
          $match: {
            appId,
            $or: [
              {
                $and: [{ createdAt: { $gte: startDate } }, { createdAt: { $lt: endDate } }],
              },
              {
                $and: [{ modifiedAt: { $gte: startDate } }, { modifiedAt: { $lt: endDate } }],
              },
            ],
          },
        },
        {
          $group: {
            _id: '$deviceId',
          },
        },
        {
          $count: 'count',
        },
      ])
      .toArray();

    return { count };
  } finally {
    client.close();
  }
};
