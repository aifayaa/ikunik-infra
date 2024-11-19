/* eslint-disable import/no-relative-packages */
import getTask from '../lib/getTask';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const taskId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const task = await getTask(taskId, appId);
    return response({ code: 200, body: task });
  } catch (e) {
    return response(errorMessage(e));
  }
};
