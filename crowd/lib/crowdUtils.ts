import { escapeRegex, reorderObjectKeys } from '@libs/utils';
import mongoCollections from '@libs/mongoCollections.json';
import { CrowdSearchPipelineFiltersType } from './crowdTypes';

const { COLL_PRESS_ARTICLES } = mongoCollections;

type GeoNearFieldType = {
  near: {
    type: string;
    coordinates: number[];
  };
  distanceField: string;
  includeLocs: string;
  spherical: boolean;
  maxDistance: number;
  query?: any;
} | null;

export function buildCrowdSearchPipeline(
  appId: string,
  filters: CrowdSearchPipelineFiltersType
) {
  const pipeline = [] as object[];
  const $match = {
    appId,
  } as Record<string, any>;
  let $geoNear: GeoNearFieldType = null;

  if (filters.lat && filters.lng && filters.radius) {
    // $geoNear Must be the first item in the query
    $geoNear = {
      near: {
        type: 'Point',
        coordinates: [filters.lng, filters.lat],
      },
      distanceField: 'geoDistance',
      includeLocs: 'geoCoordinates',
      spherical: true,
      maxDistance: filters.radius,
    };
    pipeline.unshift({
      $geoNear,
    });
  } else if (filters.geoWithin) {
    $match['metricsGeoLast.location'] = {
      $geoWithin: {
        $geometry: {
          type: 'Polygon',
          coordinates: filters.geoWithin,
          crs: {
            type: 'name',
            properties: { name: 'urn:x-mongodb:crs:strictwinding:EPSG:4326' },
          },
        },
      },
    };
  }

  if (filters.onlyBadges) {
    $match['user.badges.status'] = {
      $in: filters.onlyBadges,
    };
  }
  if (filters.requires === 'geolocation') {
    $match.metricsGeoLast = { $ne: null };
  }

  if (filters.memberId && filters.memberId.length > 0) {
    $match._id = { $in: filters.memberId };
  } else if (filters.notMemberId && filters.notMemberId.length > 0) {
    $match._id = { $nin: filters.notMemberId };
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

  reorderObjectKeys($match, [
    'appId',
    '$text',
    'metricsGeoLast',
    'metricsGeoLast.location',
  ]);

  if (Object.keys($match).length > 0) {
    if ($geoNear) {
      if ($match.$text) {
        delete $match.$text;
      }
      $geoNear.query = $match;
    } else {
      pipeline.push({ $match });
    }
  }

  if (filters.articleId) {
    pipeline.push(
      {
        $addFields: {
          metricsTime: {
            $filter: {
              input: '$metricsTime',
              as: 'item',
              cond: { $eq: ['$$item.contentId', filters.articleId] },
            },
          },
        },
      },
      {
        $addFields: {
          readingTime: {
            $sum: '$metricsTime.time',
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
