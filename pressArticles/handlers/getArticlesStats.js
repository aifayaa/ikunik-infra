/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import getArticlesStats from '../lib/getArticlesStats';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    await checkPermsForApp(userId, appId, ['admin']);

    const stats = await getArticlesStats(appId);
    return response({ code: 200, body: stats });
  } catch (exception) {
    return handleException(exception);
  }
};
