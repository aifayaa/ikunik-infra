/* eslint-disable import/no-relative-packages */
import getTaskNews from '../lib/getTaskNews';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const taskId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const newsList = await getTaskNews(taskId, { appId, userId });
    return response({ code: 200, body: { newsList } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
