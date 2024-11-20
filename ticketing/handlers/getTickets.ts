/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getTickets from '../lib/getTickets';
import { APIGatewayProxyEvent } from 'aws-lambda';

export default async (event: APIGatewayProxyEvent) => {
  const { appId, principalId: userId } = event.requestContext.authorizer as {
    appId: string;
    principalId: string;
  };
  const { sort, from, to, skip, limit } = event.queryStringParameters || {};

  try {
    const isAdmin = await checkPermsForApp(userId, appId, ['admin'], {
      dontThrow: true,
    });

    const bookables = await getTickets(appId, isAdmin ? null : userId, {
      sort,
      from,
      to,
      skip,
      limit,
    });

    return response({
      code: 200,
      body: formatResponseBody({
        data: bookables,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
