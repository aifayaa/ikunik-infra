/* eslint-disable import/no-relative-packages */
import getUserBadge from '../lib/getUserBadge';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const userBadgeId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const userBadge = await getUserBadge(userBadgeId, appId);
    return response({ code: 200, body: { userBadge } });
  } catch (exception) {
    return handleException(exception);
  }
};
