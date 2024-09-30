import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import mongoViews from '@libs/mongoViews.json';
import { escapeRegex } from '@libs/utils';
import { filterUserPrivateFields } from '@users/lib/usersUtils';
import { buildSearchPipeline } from './crowdSearch';

const { COLL_PRESS_ARTICLES } = mongoCollections;
const { VIEW_USER_METRICS_UUID_AGGREGATED } = mongoViews;

const lambda = new Lambda({
  region: process.env.REGION,
});

type CrowdListGeoParamsType = {
  articleId?: string;
  username?: string;
  firstname?: string;
  lastname?: string;
  search?: string;
  email?: string;
  badgeId?: string;

  lat?: number;
  lng?: number;
  radius?: number;

  limit?: number;
  skip?: number;

  sortBy?: 'readingTime' | 'firstMetricAt' | 'distance' | 'lastMetricAt';
  sortOrder?: 'asc' | 'desc';
};

type UserMetricReturnedDeviceType = {
  deviceId: string;
  firstMetricAt: Date;
  lastMetricAt: Date;
  location?: [number, number];
};

type UserMetricLocationType = {
  _id: string;
  appId: string;
  contentCollection: string;
  contentId: string;
  createdAt: Date;
  deviceId: string;
  modifiedAt: boolean;
  trashed: boolean;
  type: string;
  userId: string;
  location: [number, number];
};

export default async (
  appId: string,
  pathParameters: CrowdListGeoParamsType
) => {
  const client = await MongoClient.connect();
  const db = client.db();
  try {
    const pipeline = buildSearchPipeline(appId, pathParameters);

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
    } else {
      await lambda
        .invokeAsync({
          FunctionName: `asyncLambdas-${process.env.STAGE}-rebuildUserMetricsView`,
          InvokeArgs: JSON.stringify({
            appId,
          }),
        })
        .promise();
    }

    if (pathParameters.skip) {
      pipeline.push({ $skip: pathParameters.skip });
    }

    if (pathParameters.limit) {
      pipeline.push({ $limit: pathParameters.limit });
    }

    const features = await db
      .collection(VIEW_USER_METRICS_UUID_AGGREGATED)
      .aggregate([
        ...pipeline,
        {
          $projection: {
            userId: 1,
            deviceId: 1,
            geoDistance: 1,
            geoCoordinates: 1,
            'metricsGeoLast._id': 1,
            'metricsGeoLast.location': 1,
            'metricsGeo._id': 1,
            'metricsGeo.location': 1,
          },
        },
      ])
      .toArray();

    // Returning a GeoJSON
    return { type: 'FeatureCollection', features };
  } finally {
    client.close();
  }
};
