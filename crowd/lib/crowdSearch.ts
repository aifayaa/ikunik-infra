import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import mongoViews from '@libs/mongoViews.json';
import { escapeRegex } from '@libs/utils';
import { filterUserPrivateFields } from '@users/lib/usersUtils';

const { COLL_PRESS_ARTICLES } = mongoCollections;
const { VIEW_USER_METRICS_UUID_AGGREGATED } = mongoViews;

const lambda = new Lambda({
  region: process.env.REGION,
});

type CrowdSearchParamsType = {
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

  sortBy?: 'readTime' | 'firstMetricAt' | 'distance' | 'lastMetricAt';
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

export function buildSearchPipeline(
  appId: string,
  pathParameters: CrowdSearchParamsType
) {
  const pipeline = [];
  const $match = {
    appId,
  } as Record<string, any>;

  if (pathParameters.lat && pathParameters.lng && pathParameters.radius) {
    // $geoNear Must be the first item in the query
    pipeline.unshift({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [pathParameters.lng, pathParameters.lat],
        },
        distanceField: 'geoDistance',
        includeLocs: 'geoCoordinates',
        spherical: true,
        maxDistance: pathParameters.radius,
      },
    });
  }

  if (pathParameters.search) {
    $match.$text = { $search: pathParameters.search };
  }
  if (pathParameters.username) {
    $match['user.profile.username'] = {
      $regex: escapeRegex(pathParameters.username),
    };
  }
  if (pathParameters.firstname) {
    $match['user.profile.firstname'] = {
      $regex: escapeRegex(pathParameters.firstname),
    };
  }
  if (pathParameters.lastname) {
    $match['user.profile.lastname'] = {
      $regex: escapeRegex(pathParameters.lastname),
    };
  }

  if (pathParameters.badgeId) {
    $match['user.badge.id'] = pathParameters.badgeId;
  }

  if (pathParameters.articleId) {
    $match.metricsTime = {
      $elemMatch: {
        contentCollection: COLL_PRESS_ARTICLES,
        contentId: pathParameters.articleId,
      },
    };
  }

  if (pathParameters.email) {
    $match.$or = [
      {
        'user.profile.email': {
          $regex: escapeRegex(pathParameters.email),
        },
      },
      {
        'emails.address': {
          $regex: escapeRegex(pathParameters.email),
        },
      },
    ];
  }

  pipeline.push({ $match });

  if (pathParameters.articleId) {
    pipeline.push(
      {
        $addFields: {
          metricsTime: {
            $filter: {
              input: '$metricsTime',
              as: 'item',
              cond: { $eq: ['$$item.articleId', pathParameters.articleId] },
            },
          },
        },
      },
      {
        $addFields: {
          readTime: {
            $reduce: {
              input: '$metricsTime',
              initialValue: 0,
              in: { $add: ['$$readTime', '$$this.timeDuration'] },
            },
          },
        },
      }
    );
  }

  if (pathParameters.sortBy) {
    if (pathParameters.sortBy === 'distance') {
      /* Shall be already sorted if geoloction is enabled */
    } else if (pathParameters.sortBy === 'firstMetricAt') {
      pipeline.push({
        $sort: { firstMetricAt: pathParameters.sortOrder === 'asc' ? 1 : -1 },
      });
    } else if (pathParameters.sortBy === 'lastMetricAt') {
      pipeline.push({
        $sort: { lastMetricAt: pathParameters.sortOrder === 'asc' ? 1 : -1 },
      });
    } else {
      /* if (pathParameters.sortBy === 'readTime') { */
      pipeline.push({
        $sort: { readTime: pathParameters.sortOrder === 'asc' ? 1 : -1 },
      });
    }
  }

  return pipeline;
}

export default async (appId: string, pathParameters: CrowdSearchParamsType) => {
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

    const rawItems = await db
      .collection(VIEW_USER_METRICS_UUID_AGGREGATED)
      .aggregate([
        ...pipeline,
        { $skip: pathParameters.skip || 0 },
        { $limit: pathParameters.limit || 10 },
      ])
      .toArray();

    const [{ total = 0 } = {}] = await db
      .collection(VIEW_USER_METRICS_UUID_AGGREGATED)
      .aggregate([...pipeline, { $count: 'total' }])
      .toArray();

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

      item.metricsTime.forEach((metric: UserMetricLocationType) => {
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

    return { total, items };
  } finally {
    client.close();
  }
};
