/* eslint-disable import/no-relative-packages */
import getAppTranslations from '../lib/getAppTranslations';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { checkAppPlanForLimitAccess } from 'appsFeaturePlans/lib/checkAppPlanForLimits';

export default async (event: APIGatewayProxyEvent) => {
  const { appId: authorizerAppId } = event.requestContext.authorizer as {
    appId: string;
  };
  const pathAppId = event.pathParameters?.id;

  try {
    const appId = pathAppId || authorizerAppId;

    const allowed = await checkAppPlanForLimitAccess(appId, 'translations');

    let translations = {};
    if (allowed) {
      translations = await getAppTranslations(appId);
    }

    return response({
      code: 200,
      body: formatResponseBody({
        data: translations || {},
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
