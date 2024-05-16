/* eslint-disable import/no-relative-packages */
import getPollResults from '../lib/getPollResults';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const pollId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const pollResults = await getPollResults(pollId, appId);

    return response({ code: 200, body: pollResults });
  } catch (exception) {
    return handleException(exception);
  }
};
