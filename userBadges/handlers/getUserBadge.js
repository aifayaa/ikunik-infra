/* eslint-disable import/no-relative-packages */
import getUserBadge from '../lib/getUserBadge';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const userBadgeId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const userBadge = await getUserBadge(userBadgeId, appId);
    return response({ code: 200, body: { userBadge } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
