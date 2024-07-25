/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import response, { handleException } from '../../libs/httpResponses/response';
import { getApp } from '../../apps/lib/appsUtils';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  const { appId } = event.requestContext.authorizer as {
    appId: string;
  };

  try {
    const app = await getApp(appId);
    const apiUrl =
      app &&
      app.settings &&
      app.settings.myfidbackend &&
      app.settings.myfidbackend.apiUrl
        ? `${app.settings.myfidbackend.apiUrl}/reset`
        : '/#';

    return response({
      code: 200,
      body: formatResponseBody({
        data: {
          url: apiUrl,
        },
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
