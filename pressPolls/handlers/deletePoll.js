/* eslint-disable import/no-relative-packages */
import deletePoll from '../lib/deletePoll';
import errorMessage from '../../libs/httpResponses/errorMessage';
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

    const newPoll = await deletePoll(pollId, appId);
    return response({ code: 200, body: newPoll });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
