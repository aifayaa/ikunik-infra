/* eslint-disable import/no-relative-packages */
// import { APIGatewayProxyEvent } from 'aws-lambda';
import response from '../../libs/httpResponses/response.ts';
import { getApp } from '../../apps/lib/appsUtils.ts';
// import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';

// export default async (event: APIGatewayProxyEvent) => {
//   const { appId, principalId: userId } = event.requestContext.authorizer as {
//     appId: string;
//     principalId: string;
//   };
export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    if (!userId) {
      throw new Error('forbidden');
    }

    const app = await getApp(appId);
    const apiUrl =
      app &&
      app.settings &&
      app.settings.myfidbackend &&
      app.settings.myfidbackend.apiUrl
        ? app.settings.myfidbackend.apiUrl
        : '#';

    return response({
      code: 200,
      // body: formatResponseBody({
      //   data: {
      //     url: apiUrl,
      //   },
      // }),
      body: {
        url: apiUrl,
      },
    });
  } catch (exception) {
    // return handleException(exception);
    return response(errorMessage({ message: exception.message }));
  }
};
