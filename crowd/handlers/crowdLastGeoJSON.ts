/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import response, { handleException } from '../../libs/httpResponses/response';
import crowdLastGeoJSON from '../lib/crowdLastGeoJSON';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody.js';
import { z } from 'zod';

const crowdLastGeoJSONSchema = z.object({
  from: z.string().trim().datetime(),
  all: z.enum(['true', 'false']).optional(),
});

function parseUrlParams(params: z.infer<typeof crowdLastGeoJSONSchema>) {
  const ret = {
    from: new Date(params.from),
    all: params.all === 'true',
  };

  return ret;
}

export function parseLastGeoJSONQuery(event: APIGatewayProxyEvent) {
  const searchQuery = parseUrlParams(
    crowdLastGeoJSONSchema.parse(event.queryStringParameters || {})
  );

  return searchQuery;
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

    const pathParameters = parseLastGeoJSONQuery(event);

    const results = await crowdLastGeoJSON(appId, pathParameters);

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
