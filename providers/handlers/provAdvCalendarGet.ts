/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import response, { handleException } from '../../libs/httpResponses/response';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import provAdvCalendarGet from 'providers/lib/provAdvCalendarGet';
import { filterAppPrivateFields } from '@apps/lib/appsUtils';

export default async (event: APIGatewayProxyEvent) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer as {
      appId: string;
      principalId: string;
    };

    const result = await provAdvCalendarGet(userId, appId);

    return response({
      code: 200,
      body: formatResponseBody({
        data: result,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
