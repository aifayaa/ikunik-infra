import { escapeRegex } from '@libs/utils';
import mongoCollections from '@libs/mongoCollections.json';
import { CrowdSearchPipelineFiltersType } from './crowdTypes';

const { COLL_PRESS_ARTICLES } = mongoCollections;

export function buildCrowdSearchPipeline(
  appId: string,
  filters: CrowdSearchPipelineFiltersType
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

  if (filters.requires === 'geolocation') {
    $match.metricsGeoLast = { $ne: null };
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
  if (filters.type && filters.type.length > 0) {
    $match.type = { $in: filters.type };
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
              in: { $add: ['$$readingTime', '$$this.time'] },
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
