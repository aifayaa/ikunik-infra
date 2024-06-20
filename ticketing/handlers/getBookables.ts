/* eslint-disable import/no-relative-packages */
import updateBookable from '../lib/updateBookable';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getBookables from '../lib/getBookables';

export default async (event: any) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { q: query, sort, from, to } = event.queryStringParameters || {};

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const newBookable = await getBookables(appId, { query, sort, from, to });

    return response({
      code: 200,
      body: formatResponseBody({
        data: newBookable,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
