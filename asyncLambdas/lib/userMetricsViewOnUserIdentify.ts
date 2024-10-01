import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import mongoViews from '../../libs/mongoViews.json';

const { COLL_USERS } = mongoCollections;
const { VIEW_USER_METRICS_UUID_AGGREGATED } = mongoViews;

export default async (appId: string, userId: string, deviceId: string) => {
  const client = await MongoClient.connect();

  try {
    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId, appId });

    if (!user) {
      throw new Error(`User not found : ${userId} on app ${appId}`);
    }

    const aggUserMetrics = await client
      .db()
      .collection(VIEW_USER_METRICS_UUID_AGGREGATED)
      .findOne({ appId, userId, type: 'user' });

    if (!aggUserMetrics) {
      await client
        .db()
        .collection(VIEW_USER_METRICS_UUID_AGGREGATED)
        .insertOne({
          _id: userId,
          appId,
          userId,
          type: 'user',
          deviceIds: [],

          readingTime: 0,
          totalReadingTime: 0,
          firstMetricAt: new Date(),
          lastMetricAt: new Date(),

          metricsGeo: [],
          metricsTime: [],

          metricsGeoLast: null,
          deviceId: null,

          user,
        });
    } else {
      const deviceIds = [...aggUserMetrics.deviceIds, deviceId].filter(
        (x) => x
      );
      if (deviceIds) {
        await client
          .db()
          .collection(VIEW_USER_METRICS_UUID_AGGREGATED)
          .deleteMany({
            _id: { $in: deviceIds },
            type: 'device',
          });
      }
    }
  } finally {
    client.close();
  }
};
