import response, { handleException } from '../../libs/httpResponses/response';
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '../../libs/perms/checkPermsFor';
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
      await checkFeaturePermsForApp(userId, appId, ['ticketingScanner']);
    } catch (e) {
      await checkPermsForApp(userId, appId, ['admin']);
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
