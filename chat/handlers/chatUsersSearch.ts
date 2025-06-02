/* eslint-disable import/no-relative-packages */
import chatUsersSearch from '../lib/chatUsersSearch';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  const { appId } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
    superAdmin: boolean;
  };

  const {
    limit = '',
    search = '',
    start = '',
  } = event.queryStringParameters || {};

  try {
    const { list, count } = await chatUsersSearch(appId, {
      start: parseInt(start, 10) || 0,
      limit: parseInt(limit, 10) || 10,
      search,
    });

    return response({
      code: 200,
      body: formatResponseBody({
        data: { list, count },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
