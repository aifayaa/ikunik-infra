/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getTickets from '../lib/getTickets';

export default async (event: any) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { sort, from, to, skip, limit } = event.queryStringParameters || {};

  try {
    const bookables = await getTickets(appId, userId, {
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
