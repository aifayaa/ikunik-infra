/* eslint-disable import/no-relative-packages */
import chatUsersSearch from '../lib/chatUsersSearch';
import response, { handleException } from '../../libs/httpResponses/response';
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
