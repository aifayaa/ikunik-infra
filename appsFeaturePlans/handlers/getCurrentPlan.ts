import { APIGatewayProxyEvent } from 'aws-lambda';

import response, { handleException } from '@libs/httpResponses/response';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { getCurrentPlanForApp } from 'appsFeaturePlans/lib/getCurrentPlan';
import { getApp } from '@apps/lib/appsUtils';

export default async (event: APIGatewayProxyEvent) => {
  const { id: appId } = event.pathParameters as { id: string };

  try {
    const app = await getApp(appId);

    const computedPlan = await getCurrentPlanForApp(app, true);

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
