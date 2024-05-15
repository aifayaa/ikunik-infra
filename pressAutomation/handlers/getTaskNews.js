/* eslint-disable import/no-relative-packages */
import getTaskNews from '../lib/getTaskNews';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const taskId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const newsList = await getTaskNews(taskId, { appId, userId });
    return response({ code: 200, body: { newsList } });
  } catch (exception) {
    return handleException(exception);
  }
};
