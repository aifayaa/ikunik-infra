import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import mongoViews from '@libs/mongoViews.json';
import { escapeRegex } from '@libs/utils';

const { COLL_PRESS_ARTICLES, COLL_USERS, COLL_USER_METRICS } = mongoCollections;
const { VIEW_USER_METRICS_UUID_AGGREGATED } = mongoViews;

type CrowdSearchParamsType = {
  articleId?: string;
  username?: string;
  email?: string;
  badge?: string;
  location?: string;

  coordinates?: {
    lat: string;
    lng: string;
  };
  range?: number;

  limit?: number;
  page?: number;
  sortBy?: 'readTime' | 'firstAccess' | 'location' | 'country';
  sortOrder?: 'asc' | 'desc';
};

export default async (appId: string, pathParameters: CrowdSearchParamsType) => {
  const client = await MongoClient.connect();
  try {
    const pipeline = [];
    const $match = {
      appId,
    } as Record<string, any>;

    if (pathParameters.coordinates && pathParameters.range) {
      pipeline.unshift({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [
              pathParameters.coordinates.lng,
              pathParameters.coordinates.lat,
            ],
          },
          distanceField: 'geoDistance',
          includeLocs: 'geoCoordinates',
          spherical: true,
          maxDistance: pathParameters.range,
        },
      });
    }

    if (pathParameters.username) {
      $match['user.profile.username'] = {
        $regex: escapeRegex(pathParameters.username),
      };
    }

    if (pathParameters.badge) {
      $match['user.badge.id'] = pathParameters.badge;
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

    const result = await client
      .db()
      .collection(COLL_USER_METRICS)
      .aggregate(pipeline)
      .toArray();

    return result;
  } finally {
    client.close();
  }
};
