/* eslint-disable import/no-relative-packages */
import getAppTranslations from '../lib/getAppTranslations';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  const { appId } = event.requestContext.authorizer as {
    appId: string;
  };
  try {
    const translations = await getAppTranslations(appId);

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
