/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const lambda = new Lambda({
  region: process.env.REGION,
});

const { COLL_PUSH_NOTIFICATIONS, COLL_USER_METRICS } = mongoCollections;

export default async (appId, userId, deviceId) => {
  const client = await MongoClient.connect();

  try {
    const [pushNotificationsResults, userMetricsResults] = await Promise.all([
      client.db().collection(COLL_PUSH_NOTIFICATIONS).updateMany(
        {
          appId,
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

    await lambda
      .invokeAsync({
        FunctionName: `asyncLambdas-${process.env.STAGE}-userMetricsViewOnUserIdentify`,
        InvokeArgs: JSON.stringify({
          appId,
          userId,
          deviceId,
        }),
      })
      .promise();

    return {
      pushNotificationsResults,
      userMetricsResults,
    };
  } finally {
    client.close();
  }
};
