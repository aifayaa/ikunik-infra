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
  filters: CrowdSearchParamsType
) {
  const pipeline = [] as object[];
  const $match = {
    appId,
  } as Record<string, any>;

  if (filters.lat && filters.lng && filters.radius) {
    // $geoNear Must be the first item in the query
    pipeline.unshift({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [filters.lng, filters.lat],
        },
        distanceField: 'geoDistance',
        includeLocs: 'geoCoordinates',
        spherical: true,
        maxDistance: filters.radius,
      },
    });
  }

  if (filters.userId) {
    $match.userId = { $in: filters.userId };
  }
  if (filters.deviceId) {
    $match.deviceId = { $in: filters.deviceId };
  }
  if (filters.search) {
    $match.$text = { $search: filters.search };
  }
  if (filters.type) {
    if (filters.type === 'user') {
      $match['userId'] = {
        $ne: null,
      };
    } else {
      $match['userId'] = null;
    }
  }
  if (filters.username) {
    $match['user.profile.username'] = {
      $regex: escapeRegex(filters.username),
    };
  }
  if (filters.firstname) {
    $match['user.profile.firstname'] = {
      $regex: escapeRegex(filters.firstname),
    };
  }
  if (filters.lastname) {
    $match['user.profile.lastname'] = {
      $regex: escapeRegex(filters.lastname),
    };
  }

  if (filters.badgeId) {
    $match['user.badge.id'] = filters.badgeId;
  }

  if (filters.articleId) {
    $match.metricsTime = {
      $elemMatch: {
        contentCollection: COLL_PRESS_ARTICLES,
        contentId: filters.articleId,
      },
    };
  }

  if (filters.email) {
    $match.$or = [
      {
        'user.profile.email': {
          $regex: escapeRegex(filters.email),
        },
      },
      {
        'emails.address': {
          $regex: escapeRegex(filters.email),
        },
      },
    ];
  }

  pipeline.push({ $match });

  if (filters.articleId) {
    pipeline.push(
      {
        $addFields: {
          metricsTime: {
            $filter: {
              input: '$metricsTime',
              as: 'item',
              cond: { $eq: ['$$item.articleId', filters.articleId] },
            },
          },
        },
      },
      {
        $addFields: {
          readingTime: {
            $reduce: {
              input: '$metricsTime',
              initialValue: 0,
              in: { $add: ['$$readingTime', '$$this.timeDuration'] },
            },
          },
        },
      }
    );
  }

  if (filters.sortBy) {
    if (filters.sortBy === 'distance') {
      /* Shall be already sorted if geoloction is enabled */
    } else if (filters.sortBy === 'firstMetricAt') {
      pipeline.push({
        $sort: { firstMetricAt: filters.sortOrder === 'asc' ? 1 : -1 },
      });
    } else if (filters.sortBy === 'lastMetricAt') {
      pipeline.push({
        $sort: { lastMetricAt: filters.sortOrder === 'asc' ? 1 : -1 },
      });
    } else {
      /* if (filters.sortBy === 'readingTime') { */
      pipeline.push({
        $sort: { readingTime: filters.sortOrder === 'asc' ? 1 : -1 },
      });
    }
  }

  return pipeline;
}

export default async (appId: string, filters: CrowdSearchParamsType) => {
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

    const rawItems = await db
      .collection(VIEW_USER_METRICS_UUID_AGGREGATED)
      .aggregate([
        ...pipeline,
        { $skip: filters.skip || 0 },
        { $limit: filters.limit || 10 },
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
