/* eslint-disable import/no-relative-packages */
import getTask from '../lib/getTask';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const taskId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const task = await getTask(taskId, appId);
    return response({ code: 200, body: task });
  } catch (exception) {
    return handleException(exception);
  }
};
