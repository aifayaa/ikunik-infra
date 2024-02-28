/* eslint-disable import/no-relative-packages */
import getTaskNews from '../lib/getTaskNews';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];
export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  const taskId = event.pathParameters.id;

  try {
    if (!checkPerms(allowedPerms, perms)) {
      throw new Error('access_forbidden');
    }

    const newsList = await getTaskNews(taskId, { appId, userId });
    return response({ code: 200, body: { newsList } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
