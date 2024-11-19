/* eslint-disable import/no-relative-packages */
import getPollResults from '../lib/getPollResults';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const pollId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const pollResults = await getPollResults(pollId, appId);

    return response({ code: 200, body: pollResults });
  } catch (e) {
    return response(errorMessage(e));
  }
};
