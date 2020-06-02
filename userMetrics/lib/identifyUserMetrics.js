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
        .update(
          {
            deviceUUID: deviceId,
            userId: null,
          },
          { userId },
        ),
      client
        .db(DB_NAME)
        .collection(COLL_USER_METRICS)
        .update(
          {
            appIds: { $elemMatch: { $eq: appId } },
            deviceId,
            userId: null,
          },
          { userId },
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
