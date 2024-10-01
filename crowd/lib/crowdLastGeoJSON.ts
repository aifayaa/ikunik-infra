import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';

const { COLL_USER_METRICS } = mongoCollections;

const lambda = new Lambda({
  region: process.env.REGION,
});

type CrowdSearchGeoJSONParamsType = {
  from: Date;
  all: boolean;
};

export default async (appId: string, filters: CrowdSearchGeoJSONParamsType) => {
  const client = await MongoClient.connect();
  const db = client.db();
  try {
    const pipeline: object[] = [
      {
        $match: {
          appId,
          type: 'geolocation',
          createdAt: { $gt: filters.from },
        },
      },
    ];

    if (!filters.all) {
      pipeline.push({
        $group: {
          _id: '$deviceId',
          userId: { $last: '$userId' },
          deviceId: { $last: '$deviceId' },
          location: { $last: '$location' },
        },
      });
    }

    if (!filters)
      pipeline.push({
        $project: {
          type: 'Feature',

          'properties._id': '$_id',
          'properties.userId': '$userId',
          'properties.deviceId': '$deviceId',

          'geometry.type': 'Point',
          'geometry.coordinates': '$location',
        },
      });

    const features = await db
      .collection(COLL_USER_METRICS)
      .aggregate(pipeline)
      .toArray();

    // Returning a GeoJSON
    return { type: 'FeatureCollection', features };
  } finally {
    client.close();
  }
};
