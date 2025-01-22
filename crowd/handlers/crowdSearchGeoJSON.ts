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
import { parseSearchGeoJSONQuery } from 'crowd/lib/crowdZodSchemas';

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

    const searchQuery = parseSearchGeoJSONQuery(event);

    const results = await crowdSearchGeoJSON(appId, searchQuery);

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
