import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import mongoViews from '../../libs/mongoViews.json';

const { COLL_USER_METRICS, COLL_USERS } = mongoCollections;
const { VIEW_USER_METRICS_UUID_AGGREGATED } = mongoViews;

export default async (appId: string) => {
  const client = await MongoClient.connect();

  try {
    const cursor = await client
      .db()
      .collection(COLL_USER_METRICS)
      .aggregate([
        { $match: { appId } },
        {
          $group: {
            _id: { $ifNull: ['$userId', '$deviceId'] },

            type: {
              $first: { $cond: [{ $eq: ['$userId', null] }, 'device', 'user'] },
            },

            deviceIds: {
              $addToSet: '$deviceId',
            },
            userId: { $first: '$userId' },
            appId: { $first: '$appId' },

            readingTime: { $sum: '$time' },
            totalReadingTime: { $sum: '$time' },
            firstMetricAt: { $min: '$createdAt' },
            lastMetricAt: { $max: '$createdAt' },

            metricsGeo: {
              $push: {
                $cond: [
                  { $eq: ['$type', 'geolocation'] },
                  '$$ROOT',
                  '$$REMOVE',
                ],
              },
            },
            metricsTime: {
              $push: {
                $cond: [{ $eq: ['$type', 'time'] }, '$$ROOT', '$$REMOVE'],
              },
            },
          },
        },
        {
          $set: {
            metricsGeoLast: {
              $cond: [
                { $eq: [{ $size: '$metricsGeo' }, 0] },
                null,
                { $arrayElemAt: ['$metricsGeo', -1] },
              ],
            },
            deviceId: {
              $cond: [
                { $eq: [{ $size: '$deviceIds' }, 0] },
                null,
                { $arrayElemAt: ['$deviceIds', 0] },
              ],
            },
          },
        },
        {
          $lookup: {
            from: COLL_USERS,
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true,
          },
        },

        /* Final merge to the view */
        {
          $merge: {
            into: VIEW_USER_METRICS_UUID_AGGREGATED,
            whenMatched: 'replace',
          },
        },
      ]);

    await cursor.next();
  } finally {
    client.close();
  }
};
