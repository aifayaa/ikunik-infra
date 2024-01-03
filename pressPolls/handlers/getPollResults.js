import errorMessage from '../../libs/httpResponses/errorMessage';
import getPollResults from '../lib/getPollResults';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  const pollId = event.pathParameters.id;

  try {
    if (!checkPerms(allowedPerms, perms)) {
      throw new Error('access_forbidden');
    }

    const pollResults = await getPollResults(pollId, appId);

    return response({ code: 200, body: pollResults });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
