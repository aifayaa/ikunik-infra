/* eslint-disable import/no-relative-packages */
import getTask from '../lib/getTask';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];
export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  const taskId = event.pathParameters.id;

  try {
    if (!checkPerms(allowedPerms, perms)) {
      throw new Error('access_forbidden');
    }

    const task = await getTask(taskId, appId);
    return response({ code: 200, body: task });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
