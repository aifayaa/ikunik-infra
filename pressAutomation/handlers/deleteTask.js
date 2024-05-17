/* eslint-disable import/no-relative-packages */
import deleteTask from '../lib/deleteTask';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const taskId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const deletedTask = await deleteTask(taskId, appId);
    return response({ code: 200, body: deletedTask });
  } catch (exception) {
    return handleException(exception);
  }
};
