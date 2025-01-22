import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  INVALID_INPUT_FORMAT_CODE,
} from '@libs/httpResponses/errorCodes';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';
import { GeoJSONCoordinatesType } from './crowdTypes';

/* ################ *
 * Common functions *
 * ################ */
function floatStrParser(val: any) {
  if (!val || typeof val !== 'string') return false;

  const fval = parseFloat(val);

  if (Number.isNaN(fval)) {
    return false;
  }

  return true;
}

function intStrParser(val: any) {
  if (!val || typeof val !== 'string') return false;

  const fval = parseFloat(val);
  const ival = parseInt(val);

  if (fval !== ival || Number.isNaN(ival)) {
    return false;
  }

  return true;
}

function floatArrayPairsStrParser(val: any) {
  if (!val || typeof val !== 'string') return false;

  const intArray = val.split(',').map((x) => x.trim());
  const ok = intArray.every(floatStrParser);

  if (intArray.length !== 2 || !ok) {
    return false;
  }

  return true;
}

function parseGeoWithinField(val: string[] | undefined) {
  if (!val) return val;

  const ret = val.map((x) => {
    const splitted = x.split(',').map((y) => parseFloat(y));
    if (
      splitted.length !== 2 ||
      typeof splitted[0] !== 'number' ||
      typeof splitted[1] !== 'number'
    ) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_INPUT_FORMAT_CODE,
        'geoWithin coordinate have invalid length or type'
      );
    }

    return splitted as GeoJSONCoordinatesType;
  });

  if (ret.length < 3) {
    throw new CrowdaaError(
      ERROR_TYPE_VALIDATION_ERROR,
      INVALID_INPUT_FORMAT_CODE,
      `geoWithin field is invalid, 3 or more points required`
    );
  }

  return ret;
}

/* ########### *
 * Mass Update *
 * ########### */
export const crowdMassUpdateActionSchema = z
  .object({
    action: z.enum(['notify', 'addBadges', 'delBadges']),
  })
  .strict()
  .required();

const crowdMassUpdateFiltersSchema = z
  .object({
    articleId: z.string().trim().optional(),
    username: z.string().trim().optional(),
    firstname: z.string().trim().optional(),
    lastname: z.string().trim().optional(),
    search: z.string().trim().optional(),
    email: z.string().trim().optional(),
    badgeId: z.string().trim().optional(),

    lat: z.number().optional(),
    lng: z.number().optional(),
    radius: z.number().optional(),

    limit: z.number().int().optional(),
    skip: z.number().int().optional(),

    sortBy: z
      .enum(['readingTime', 'firstMetricAt', 'lastMetricAt', 'distance'])
      .optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),

    type: z.array(z.enum(['user', 'device', 'userDevice'])).optional(),
    memberId: z.array(z.string().trim()).optional(),
    notMemberId: z.array(z.string().trim()).optional(),
    deviceId: z.array(z.string().trim()).optional(),
    geoWithin: z
      .array(
        z
          .array(z.number())
          .length(2)
          .transform((x) => x as GeoJSONCoordinatesType)
      )
      .min(3)
      .optional(),
  })
  .strict();

export const crowdMassUpdateNotifySchema = z.object({
  filters: crowdMassUpdateFiltersSchema,
  notifyAt: z.date().optional(),
  payload: z.object({
    title: z.string().trim(),
    content: z.string().trim(),
    extraData: z
      .object({
        articleId: z.string().optional(),
        userArticleId: z.string().optional(),
        chatRoomId: z.string().optional(),
        webviewUrl: z.string().optional(),
        hideNavbar: z.boolean().optional(),
      })
      .default({}),
  }),
});

export const crowdMassUpdateBadgesSchema = z.object({
  filters: crowdMassUpdateFiltersSchema,
  badgeIds: z.array(z.string().trim()),
});

/* ###### *
 * Search *
 * ###### */
const crowdSearchSchema = z
  .object({
    articleId: z.string().trim().optional(),
    username: z.string().trim().optional(),
    firstname: z.string().trim().optional(),
    lastname: z.string().trim().optional(),
    search: z.string().trim().optional(),
    email: z.string().trim().optional(),
    badgeId: z.string().trim().optional(),

    lat: z.custom<'123'>(floatStrParser).optional(),
    lng: z.custom<'123'>(floatStrParser).optional(),
    radius: z.custom<'123'>(floatStrParser).optional(),

    limit: z.custom<'123'>(intStrParser).optional(),
    skip: z.custom<'123'>(intStrParser).optional(),

    sortBy: z
      .enum(['', 'readingTime', 'firstMetricAt', 'lastMetricAt', 'distance'])
      .optional(),
    sortOrder: z.enum(['', 'asc', 'desc']).optional(),
  })
  .strict();

const crowdSearchMultiSchema = z
  .object({
    type: z.array(z.enum(['user', 'device', 'userDevice'])).optional(),
    userId: z.array(z.string().trim()).optional(),
    deviceId: z.array(z.string().trim()).optional(),
    geoWithin: z.array(z.custom<string>(floatArrayPairsStrParser)).optional(),
    onlyBadges: z
      .array(z.enum(['assigned', 'requested', 'validated', 'rejected']))
      .optional(),
  })
  .strict();

function filterArrayParams(params: string[] | undefined) {
  if (!params) return undefined;
  if (params.length === 0) return undefined;

  const filtered = params.filter((x) => x.trim().length > 0);
  if (filtered.length === 0) return undefined;

  return filtered;
}

export function parseSearchQuery(event: APIGatewayProxyEvent) {
  const params = (event.queryStringParameters || {}) as z.infer<
    typeof crowdSearchSchema
  >;
  const multiParams = (event.multiValueQueryStringParameters || {}) as z.infer<
    typeof crowdSearchMultiSchema
  >;

  const ret = {
    articleId: params.articleId ? params.articleId : undefined,
    username: params.username ? params.username : undefined,
    firstname: params.firstname ? params.firstname : undefined,
    lastname: params.lastname ? params.lastname : undefined,
    search: params.search ? params.search : undefined,
    email: params.email ? params.email : undefined,
    badgeId: params.badgeId ? params.badgeId : undefined,

    type: filterArrayParams(multiParams.type),

    userId: filterArrayParams(multiParams.userId),
    deviceId: filterArrayParams(multiParams.deviceId),
    onlyBadges: filterArrayParams(multiParams.onlyBadges),

    lat: params.lat ? parseFloat(params.lat) : undefined,
    lng: params.lng ? parseFloat(params.lng) : undefined,
    radius: params.radius ? parseInt(params.radius, 10) : undefined,

    geoWithin: parseGeoWithinField(filterArrayParams(multiParams.geoWithin)),

    limit: params.limit ? parseInt(params.limit, 10) : undefined,
    skip: params.skip ? parseInt(params.skip, 10) : undefined,

    sortBy: params.sortBy ? params.sortBy : undefined,
    sortOrder: params.sortOrder ? params.sortOrder : undefined,
  };

  return ret;
}

/* ############# *
 * SearchGeoJSON *
 * ############# */
const crowdSearchGeoJSONSchema = z
  .object({
    articleId: z.string().trim().optional(),
    username: z.string().trim().optional(),
    firstname: z.string().trim().optional(),
    lastname: z.string().trim().optional(),
    search: z.string().trim().optional(),
    email: z.string().trim().optional(),
    badgeId: z.string().trim().optional(),

    lat: z.custom<'123'>(floatStrParser).optional(),
    lng: z.custom<'123'>(floatStrParser).optional(),
    radius: z.custom<'123'>(floatStrParser).optional(),

    limit: z.custom<'123'>(intStrParser).optional(),
    skip: z.custom<'123'>(intStrParser).optional(),

    sortBy: z
      .enum(['', 'readingTime', 'firstMetricAt', 'lastMetricAt', 'distance'])
      .optional(),
    sortOrder: z.enum(['', 'asc', 'desc']).optional(),
  })
  .strict();

const crowdSearchGeoJSONMultiSchema = z
  .object({
    type: z.array(z.enum(['user', 'device', 'userDevice'])).optional(),
    userId: z.array(z.string().trim()).optional(),
    deviceId: z.array(z.string().trim()).optional(),
    geoWithin: z.array(z.custom<string>(floatArrayPairsStrParser)).optional(),
    onlyBadges: z
      .array(z.enum(['assigned', 'requested', 'validated', 'rejected']))
      .optional(),
  })
  .strict();

export function parseSearchGeoJSONQuery(event: APIGatewayProxyEvent) {
  const params = (event.queryStringParameters || {}) as z.infer<
    typeof crowdSearchGeoJSONSchema
  >;
  const multiParams = (event.multiValueQueryStringParameters || {}) as z.infer<
    typeof crowdSearchGeoJSONMultiSchema
  >;

  const ret = {
    articleId: params.articleId ? params.articleId : undefined,
    username: params.username ? params.username : undefined,
    firstname: params.firstname ? params.firstname : undefined,
    lastname: params.lastname ? params.lastname : undefined,
    search: params.search ? params.search : undefined,
    email: params.email ? params.email : undefined,
    badgeId: params.badgeId ? params.badgeId : undefined,

    type: filterArrayParams(multiParams.type),
    userId: filterArrayParams(multiParams.userId),
    deviceId: filterArrayParams(multiParams.deviceId),
    onlyBadges: filterArrayParams(multiParams.onlyBadges),

    lat: params.lat ? parseFloat(params.lat) : undefined,
    lng: params.lng ? parseFloat(params.lng) : undefined,
    radius: params.radius ? parseInt(params.radius, 10) : undefined,

    geoWithin: parseGeoWithinField(filterArrayParams(multiParams.geoWithin)),

    limit: params.limit ? parseInt(params.limit, 10) : undefined,
    skip: params.skip ? parseInt(params.skip, 10) : undefined,

    sortBy: params.sortBy ? params.sortBy : undefined,
    sortOrder: params.sortOrder ? params.sortOrder : undefined,
  };

  return ret;
}

/* ########### *
 * LastGeoJSON *
 * ########### */
const crowdLastGeoJSONSchema = z.object({
  from: z.string().trim().datetime(),
  all: z.enum(['true', 'false']).optional(),
});

export function parseLastGeoJSONQuery(event: APIGatewayProxyEvent) {
  const params = (event.queryStringParameters || {}) as z.infer<
    typeof crowdLastGeoJSONSchema
  >;

  const ret = {
    from: new Date(params.from || Date.now()),
    all: params.all === 'true',
  };

  return ret;
}
