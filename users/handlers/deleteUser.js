import deleteUser from '../lib/deleteUser';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];
export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;
  const perms = JSON.parse(event.requestContext.authorizer.perms);

  try {
    if (userId !== urlId && !checkPerms(allowedPerms, perms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }

    const deleteRefs = await deleteUser(userId, appId);
    return response({ code: 200, body: deleteRefs });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
