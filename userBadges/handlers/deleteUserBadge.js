import deleteUserBadge from '../lib/deleteUserBadge';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];
export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const userBadgeId = event.pathParameters.id;
  const perms = JSON.parse(event.requestContext.authorizer.perms);

  try {
    if (!checkPerms(allowedPerms, perms)) {
      throw new Error('access_forbidden');
    }

    await deleteUserBadge(userBadgeId, appId);
    return response({ code: 200, body: { ok: true } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
