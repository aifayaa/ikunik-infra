import { APIGatewayProxyEvent } from 'aws-lambda';

import response, { handleException } from '@libs/httpResponses/response';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { getCurrentPlanForAppId } from 'appsFeaturePlans/lib/getCurrentPlan';

export default async (event: APIGatewayProxyEvent) => {
  const { id: appId } = event.pathParameters as { id: string };

  try {
    const computedPlan = await getCurrentPlanForAppId(appId, true);

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
