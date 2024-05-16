/* eslint-disable import/no-relative-packages */
import runTask from '../lib/runTask';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const taskId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const queryId = await runTask(taskId, { appId, userId });
    return response({ code: 200, body: { queryId } });
  } catch (exception) {
    return handleException(exception);
  }
};
