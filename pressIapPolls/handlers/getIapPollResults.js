/* eslint-disable import/no-relative-packages */
import getIapPollResults from '../lib/getIapPollResults';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const iapPollId = event.pathParameters.id;
  let { start, limit } = event.queryStringParameters || {};

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    if (start && limit) {
      start = parseInt(start, 10) || 0;
      limit = parseInt(limit, 10) || 25;
    } else {
      start = null;
      limit = null;
    }

    const iapPollResults = await getIapPollResults(iapPollId, appId, {
      start,
      limit,
    });

    return response({ code: 200, body: iapPollResults });
  } catch (e) {
    return response(errorMessage(e));
  }
};
