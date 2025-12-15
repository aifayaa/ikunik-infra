/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import response, { handleException } from '../../libs/httpResponses/response';
import { getApp } from '../../apps/lib/appsUtils';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getMyStars from 'ghanty/lib/getMyStars';

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };

  try {
    const data = await getMyStars(appId, userId);

    return response({
      code: 200,
      body: formatResponseBody({
        data,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
