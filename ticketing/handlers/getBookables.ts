/* eslint-disable import/no-relative-packages */
import updateBookable from '../lib/updateBookable';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import getBookables from '../lib/getBookables';

export default async (event: any) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const {
    q: query,
    sort,
    from,
    to,
    skip,
    limit,
  } = event.queryStringParameters || {};

  try {
    try {
      await checkPermsForApp(userId, appId, ['admin']);
    } catch (e) {
      /* We are not admin, but do we have any perms on bookables through badges? */
    }

    const bookables = await getBookables(appId, {
      query,
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
