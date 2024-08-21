import { APIGatewayProxyEvent } from 'aws-lambda';

import response, { handleException } from '@libs/httpResponses/response';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { getApp } from '@apps/lib/appsUtils';
import { getCurrentPlanForApp } from 'appsFeaturePlans/lib/getCurrentPlan';

export default async (event: APIGatewayProxyEvent) => {
  const { id: appId } = event.pathParameters as { id: string };

  try {
    const app = await getApp(appId);

    const computedPlan = getCurrentPlanForApp(app);

    return response({
      code: 200,
      body: formatResponseBody({
        data: computedPlan,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
