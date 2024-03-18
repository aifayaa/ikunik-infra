/* eslint-disable import/no-relative-packages */
import getTask from '../lib/getTask';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const taskId = event.pathParameters.id;

  try {
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const task = await getTask(taskId, appId);
    return response({ code: 200, body: task });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
