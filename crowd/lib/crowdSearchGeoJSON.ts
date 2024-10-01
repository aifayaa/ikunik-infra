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

type CrowdSearchGeoJSONParamsType = {
  articleId?: string;
  username?: string;
  firstname?: string;
  lastname?: string;
  search?: string;
  email?: string;
  badgeId?: string;
  type?: 'user' | 'device';
  userId?: string[];
  deviceId?: string[];

  lat?: number;
  lng?: number;
  radius?: number;

  limit?: number;
  skip?: number;

  sortBy?: 'readingTime' | 'firstMetricAt' | 'distance' | 'lastMetricAt';
  sortOrder?: 'asc' | 'desc';
};

export default async (appId: string, filters: CrowdSearchGeoJSONParamsType) => {
  const client = await MongoClient.connect();
  const db = client.db();
  try {
    const pipeline = buildSearchPipeline(appId, filters);

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

    if (filters.skip) {
      pipeline.push({ $skip: filters.skip });
    }

    if (filters.limit) {
      pipeline.push({ $limit: filters.limit });
    }

    pipeline.push({
      $project: {
        type: 'Feature',

        'properties._id': '$metricsGeoLast._id',

        'properties.userId': '$userId',
        'properties.deviceId': '$deviceId',
        // 'properties.geoDistance': '$geoDistance',
        // 'properties.geoCoordinates': '$geoCoordinates',

        'geometry.type': 'Point',
        'geometry.coordinates': '$metricsGeoLast.location',
      },
    });

    const features = await db
      .collection(VIEW_USER_METRICS_UUID_AGGREGATED)
      .aggregate(pipeline)
      .toArray();

    // Returning a GeoJSON
    return { type: 'FeatureCollection', features };
  } finally {
    client.close();
  }
};
