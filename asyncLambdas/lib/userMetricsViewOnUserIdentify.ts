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

    const previousDeviceIds =
      (aggUserMetrics && aggUserMetrics.deviceIds) || [];

    const deviceIds = [...previousDeviceIds, deviceId].filter((x) => x);

    await client
      .db()
      .collection(VIEW_USER_METRICS_UUID_AGGREGATED)
      .deleteMany({
        appId,
        type: 'device',
        deviceId: { $in: deviceIds },
      });
  } finally {
    client.close();
  }
};
