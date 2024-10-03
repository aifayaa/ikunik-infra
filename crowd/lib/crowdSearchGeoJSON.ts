import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '@libs/mongoClient';
import mongoViews from '@libs/mongoViews.json';
import { CrowdSearchGeoJSONParamsType } from './crowdTypes';
import { buildCrowdSearchPipeline } from './crowdUtils';

const { VIEW_USER_METRICS_UUID_AGGREGATED } = mongoViews;

const lambda = new Lambda({
  region: process.env.REGION,
});

export default async (appId: string, filters: CrowdSearchGeoJSONParamsType) => {
  const client = await MongoClient.connect();
  const db = client.db();
  try {
    const pipeline = buildCrowdSearchPipeline(appId, {
      ...filters,
      requires: 'geolocation',
    });

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
        _id: false,
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
