/* eslint-disable import/no-relative-packages */
import { runTaskFromData } from '../lib/runTask';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const taskData = JSON.parse(event.body);

    const queryId = await await runTaskFromData(taskData, { appId, userId });

    return response({ code: 200, body: { queryId } });
  } catch (exception) {
    return handleException(exception);
  }
};
