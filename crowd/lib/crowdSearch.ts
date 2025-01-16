import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '@libs/mongoClient';
import mongoViews from '@libs/mongoViews.json';
import { filterUserPrivateFields } from '@users/lib/usersUtils';
import {
  CrowdSearchParamsType,
  UserMetricLocationType,
  UserMetricReturnedDeviceType,
  UserMetricTimeType,
} from './crowdTypes';
import { buildCrowdSearchPipeline } from './crowdUtils';

const {
  VIEW_USER_METRICS_UUID_AGGREGATED,
  VIEW_USER_METRICS_UUID_AGGREGATED_META,
} = mongoViews;

const lambda = new Lambda({
  region: process.env.REGION,
});

export default async (appId: string, filters: CrowdSearchParamsType) => {
  const client = await MongoClient.connect();
  const db = client.db();
  try {
    const pipeline = buildCrowdSearchPipeline(appId, filters);

    const firstItem = await db
      .collection(VIEW_USER_METRICS_UUID_AGGREGATED)
      .findOne({ appId });

    if (!firstItem) {
      await lambda
        .invoke({
          FunctionName: `asyncLambdas-${process.env.STAGE}-rebuildUserMetricsView`,
          Payload: JSON.stringify({
            appId,
          }),
        })
        .promise();
    }

    const viewMeta = await db
      .collection(VIEW_USER_METRICS_UUID_AGGREGATED_META)
      .findOne({ appId });

    const { updatedAt = new Date() } = viewMeta || {};

    const rawItemsPromise = db
      .collection(VIEW_USER_METRICS_UUID_AGGREGATED)
      .aggregate([
        ...pipeline,
        { $skip: filters.skip || 0 },
        { $limit: filters.limit || 10 },
      ])
      .toArray();

    const totalPromise = db
      .collection(VIEW_USER_METRICS_UUID_AGGREGATED)
      .aggregate([...pipeline, { $count: 'total' }])
      .toArray();

    const [rawItems, [{ total = 0 } = {}]] = await Promise.all([
      rawItemsPromise,
      totalPromise,
    ]);

    const items = rawItems.map(({ ...item }) => {
      if (item.user) {
        item.user = filterUserPrivateFields(item.user);
      }

      const hash: Record<string, UserMetricReturnedDeviceType> = {};

      item.metricsGeo.forEach((metric: UserMetricLocationType) => {
        if (!hash[metric.deviceId]) {
          hash[metric.deviceId] = {
            deviceId: metric.deviceId,
            location: metric.location,
            firstMetricAt: metric.createdAt,
            lastMetricAt: metric.createdAt,
          };
        } else {
          if (hash[metric.deviceId].lastMetricAt < metric.createdAt) {
            hash[metric.deviceId].lastMetricAt = metric.createdAt;
            hash[metric.deviceId].location = metric.location;
          } else if (hash[metric.deviceId].firstMetricAt > metric.createdAt) {
            hash[metric.deviceId].firstMetricAt = metric.createdAt;
          }
        }
      });

      item.metricsTime.forEach((metric: UserMetricTimeType) => {
        if (!hash[metric.deviceId]) {
          hash[metric.deviceId] = {
            deviceId: metric.deviceId,
            firstMetricAt: metric.createdAt,
            lastMetricAt: metric.createdAt,
          };
        } else {
          if (hash[metric.deviceId].lastMetricAt < metric.createdAt) {
            hash[metric.deviceId].lastMetricAt = metric.createdAt;
          } else if (hash[metric.deviceId].firstMetricAt > metric.createdAt) {
            hash[metric.deviceId].firstMetricAt = metric.createdAt;
          }
        }
      });

      item.devices = Object.values(hash);

      delete item.metricsGeo;
      delete item.metricsTime;

      return item;
    });

    if (firstItem) {
      await lambda
        .invokeAsync({
          FunctionName: `asyncLambdas-${process.env.STAGE}-rebuildUserMetricsView`,
          InvokeArgs: JSON.stringify({
            appId,
          }),
        })
        .promise();
    }

    return { total, items, updatedAt };
  } finally {
    client.close();
  }
};
