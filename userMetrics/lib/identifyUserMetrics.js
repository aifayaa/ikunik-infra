/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PUSH_NOTIFICATIONS, COLL_USER_METRICS } = mongoCollections;

export default async (appId, userId, deviceId) => {
  const client = await MongoClient.connect();

  try {
    const [pushNotificationsResults, userMetricsResults] = await Promise.all([
      client.db().collection(COLL_PUSH_NOTIFICATIONS).updateMany(
        {
          deviceUUID: deviceId,
          userId: null,
        },
        { $set: { userId } }
      ),
      client
        .db()
        .collection(COLL_USER_METRICS)
        .updateMany(
          {
            appId,
            deviceId,
            userId: null,
          },
          { $set: { userId, modifiedAt: new Date() } }
        ),
    ]);

    return {
      pushNotificationsResults,
      userMetricsResults,
    };
  } finally {
    client.close();
  }
};
