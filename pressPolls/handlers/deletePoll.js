/* eslint-disable import/no-relative-packages */
import deletePoll from '../lib/deletePoll';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const pollId = event.pathParameters.id;

  try {
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const newPoll = await deletePoll(pollId, appId);
    return response({ code: 200, body: newPoll });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
