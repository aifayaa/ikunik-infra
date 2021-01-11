import MongoClient from '../../libs/mongoClient';

const {
  COLL_PUSH_NOTIFICATIONS,
  COLL_USER_METRICS,
  DB_NAME,
} = process.env;

export default async (
  appId,
  userId,
  deviceId,
) => {
  const client = await MongoClient.connect();

  try {
    const [
      pushNotificationsResults,
      userMetricsResults,
    ] = await Promise.all([
      client
        .db(DB_NAME)
        .collection(COLL_PUSH_NOTIFICATIONS)
        .updateMany(
          {
            deviceUUID: deviceId,
            userId: null,
          },
          { $set: { userId } },
        ),
      client
        .db(DB_NAME)
        .collection(COLL_USER_METRICS)
        .updateMany(
          {
            appId,
            deviceId,
            userId: null,
          },
          { $set: { userId } },
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
