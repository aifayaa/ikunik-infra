/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import response, { handleException } from '../../libs/httpResponses/response';
import crowdSearchGeoJSON from '../lib/crowdSearchGeoJSON';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody.js';
import { z } from 'zod';

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

const crowdSearchGeoJSONSchema = z.object({
  articleId: z.string().trim().optional(),
  username: z.string().trim().optional(),
  firstname: z.string().trim().optional(),
  lastname: z.string().trim().optional(),
  search: z.string().trim().optional(),
  email: z.string().trim().optional(),
  badgeId: z.string().trim().optional(),
  type: z.enum(['', 'user', 'device']).optional(),

  lat: z.custom<'123'>(floatStrParser),
  lng: z.custom<'123'>(floatStrParser),
  radius: z.custom<'123'>(intStrParser),

  limit: z.custom<'123'>(intStrParser).optional(),
  skip: z.custom<'123'>(intStrParser).optional(),

  sortBy: z
    .enum(['', 'readingTime', 'firstMetricAt', 'lastMetricAt', 'distance'])
    .optional(),
  sortOrder: z.enum(['', 'asc', 'desc']).optional(),
});

function parseUrlParams(params: z.infer<typeof crowdSearchGeoJSONSchema>) {
  const ret = {
    articleId: params.articleId ? params.articleId : undefined,
    username: params.username ? params.username : undefined,
    firstname: params.firstname ? params.firstname : undefined,
    lastname: params.lastname ? params.lastname : undefined,
    search: params.search ? params.search : undefined,
    email: params.email ? params.email : undefined,
    badgeId: params.badgeId ? params.badgeId : undefined,
    type: params.type ? params.type : undefined,

    lat: parseFloat(params.lat),
    lng: parseFloat(params.lng),
    radius: parseInt(params.radius, 10),

    limit: params.limit ? parseInt(params.limit, 10) : undefined,
    skip: params.skip ? parseInt(params.skip, 10) : undefined,

    sortBy: params.sortBy ? params.sortBy : undefined,
    sortOrder: params.sortOrder ? params.sortOrder : undefined,
  };

  return ret;
}

export default async (event: APIGatewayProxyEvent) => {
  const {
    appId,
    principalId: userId,
    superAdmin,
  } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
    superAdmin: boolean;
  };

  try {
    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'crowd');

      if (!allowed) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
          `The current plan for app '${appId}' does not allow this operation`
        );
      }
    }

    await checkPermsForApp(userId, appId, ['admin']);

    const pathParameters = parseUrlParams(
      crowdSearchGeoJSONSchema.parse(event.queryStringParameters || {})
    );

    const results = await crowdSearchGeoJSON(appId, pathParameters);

    return response({
      code: 200,
      body: formatResponseBody({
        data: results,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
