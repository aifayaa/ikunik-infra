/* eslint-disable import/no-relative-packages */
import deletePoll from '../lib/deletePoll';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const pollId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const newPoll = await deletePoll(pollId, appId);
    return response({ code: 200, body: newPoll });
  } catch (exception) {
    return handleException(exception);
  }
};
