import toggleUserPermissionToUser from '../lib/toggleUserPermissionToUser';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];
export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const userPermissionId = event.pathParameters.id;
  const perms = JSON.parse(event.requestContext.authorizer.perms);

  try {
    if (!checkPerms(allowedPerms, perms)) {
      throw new Error('access_forbidden');
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);
    const {
      action,
      userId,
    } = bodyParsed;

    if (!userPermissionId || !userId) {
      throw new Error('mal_formed_request');
    }

    const userPermission = await toggleUserPermissionToUser(
      userPermissionId,
      appId,
      { action, userId },
    );
    return response({ code: 200, body: { userPermission } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
