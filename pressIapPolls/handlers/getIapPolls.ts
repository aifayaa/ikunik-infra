/* eslint-disable import/no-relative-packages */
import getIapPolls from '../lib/getIapPolls';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  const {
    appId,
    principalId: userId,
    superAdmin,
  } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
    superAdmin?: boolean;
  };

  try {
    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'iapPolls');

      if (!allowed) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
          `The current plan for app '${appId}' does not allow this operation`
        );
      }
    }

    const params = event.queryStringParameters || {};
    const isAdmin = await checkPermsForApp(userId, appId, ['admin'], {
      dontThrow: true,
    });

    const filters: {
      start?: number | null;
      limit?: number | null;
      search?: string;
    } = {};

    const { start = '0', limit = '25' } = params;

    filters.start = parseInt(start, 10) || 0;
    filters.limit = parseInt(limit, 10) || 25;

    if (isAdmin) {
      if (params.search) filters.search = params.search;
    }

    const iapPolls = await getIapPolls(appId, filters);
    const { count } = iapPolls;
    let { list } = iapPolls;

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          items: list,
          totalCount: count,
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
