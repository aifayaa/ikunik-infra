import { runTaskFromData } from '../lib/runTask';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];

export default async (event) => {
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;

  try {
    if (!checkPerms(allowedPerms, perms)) {
      throw new Error('access_forbidden');
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const taskData = JSON.parse(event.body);

    const queryId = await await runTaskFromData(taskData, { appId, userId });

    return response({ code: 200, body: { queryId } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
