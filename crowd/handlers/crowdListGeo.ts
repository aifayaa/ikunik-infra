/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import response, { handleException } from '../../libs/httpResponses/response';
import crowdListGeo from '../lib/crowdListGeo';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody.js';
import { z } from 'zod';

function intStrParser(val: any) {
  if (!val || typeof val !== 'string') return false;

  const fval = parseFloat(val);
  const ival = parseInt(val);

  if (fval !== ival || Number.isNaN(ival)) {
    return false;
  }

  return true;
}

const crowdListGeoSchema = z.object({
  articleId: z.string().trim().optional(),
  username: z.string().trim().optional(),
  firstname: z.string().trim().optional(),
  lastname: z.string().trim().optional(),
  search: z.string().trim().optional(),
  email: z.string().trim().optional(),
  badgeId: z.string().trim().optional(),

  lat: z.custom<'123'>(intStrParser),
  lng: z.custom<'123'>(intStrParser),
  radius: z.custom<'123'>(intStrParser),

  sortBy: z
    .enum(['', 'readingTime', 'firstMetricAt', 'lastMetricAt', 'distance'])
    .optional(),
  sortOrder: z.enum(['', 'asc', 'desc']).optional(),
});

function parseUrlParams(params: z.infer<typeof crowdListGeoSchema>) {
  const ret = {
    articleId: params.articleId ? params.articleId : undefined,
    username: params.username ? params.username : undefined,
    firstname: params.firstname ? params.firstname : undefined,
    lastname: params.lastname ? params.lastname : undefined,
    search: params.search ? params.search : undefined,
    email: params.email ? params.email : undefined,
    badgeId: params.badgeId ? params.badgeId : undefined,

    lat: parseFloat(params.lat),
    lng: parseFloat(params.lng),
    radius: parseInt(params.radius, 10),

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
      crowdListGeoSchema.parse(event.queryStringParameters || {})
    );

    const results = await crowdListGeo(appId, pathParameters);

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
