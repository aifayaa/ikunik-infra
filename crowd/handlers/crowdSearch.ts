/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import buildPressPipeline from '../lib/pipelines/pressPipeline.js';
import response, { handleException } from '../../libs/httpResponses/response';
import crowdSearch from '../lib/crowdSearch';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody.js';
import { z } from 'zod';

const BOOL_TRUE_REGEX = /^(true|yes)$/i;

function coordinatesStrParser(val: any) {
  if (!val || typeof val !== 'string') return false;

  try {
    const parsed = JSON.parse(val);
    if (!parsed || typeof parsed !== 'object') {
      return false;
    }

    if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') {
      return false;
    }

    if (Object.keys(parsed).length !== 2) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
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
function boolStrParser(val: any) {
  if (!val || typeof val !== 'string') return false;

  try {
    const parsed = JSON.parse(val);
    if (!parsed || typeof parsed !== 'boolean') {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

const crowdSearchSchema = z.object({
  articleId: z.string().trim().min(1).optional(),
  username: z.string().trim().min(1).optional(),
  email: z.string().trim().min(1).optional(),
  badge: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),

  coordinates: z
    .custom<'{"lat":123,"lng":456}'>(coordinatesStrParser)
    .optional(),
  range: z.custom<'123'>(intStrParser).optional(),

  limit: z.custom<'123'>(intStrParser).optional(),
  page: z.custom<'123'>(intStrParser).optional(),
  sortBy: z.enum(['readTime', 'firstAccess', 'location', 'country']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

function parseUrlParams(params: z.infer<typeof crowdSearchSchema>) {
  const ret = {
    articleId: params.articleId ? params.articleId : undefined,
    username: params.username ? params.username : undefined,
    email: params.email ? params.email : undefined,
    badge: params.badge ? params.badge : undefined,
    location: params.location ? params.location : undefined,

    coordinates: params.coordinates
      ? JSON.parse(params.coordinates)
      : undefined,
    range: params.range ? parseInt(params.range, 10) : undefined,

    limit: params.limit ? parseInt(params.limit, 10) : undefined,
    page: params.page ? parseInt(params.page, 10) : undefined,
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
      crowdSearchSchema.parse(event.pathParameters)
    );

    const results = await crowdSearch(appId, pathParameters);

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
