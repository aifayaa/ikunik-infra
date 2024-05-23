/* eslint-disable import/no-relative-packages */
import getVideos from '../lib/getVideos';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const params = event.queryStringParameters || {};

    const filters = {};

    const { start = 0, limit = 30 } = params;

    filters.start = parseInt(start, 10);
    filters.limit = parseInt(limit, 10);

    const { count, list } = await getVideos(appId, filters);

    return response({ code: 200, body: { count, list } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
