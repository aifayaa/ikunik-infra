/* eslint-disable import/no-relative-packages */
import deleteUserBadge from '../lib/deleteUserBadge';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const userBadgeId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    await deleteUserBadge(userBadgeId, appId);
    return response({ code: 200, body: { ok: true } });
  } catch (exception) {
    return handleException(exception);
  }
};
