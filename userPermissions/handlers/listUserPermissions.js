import listUserPermissions from '../lib/listUserPermissions';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];
export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const perms = JSON.parse(event.requestContext.authorizer.perms);

  try {
    console.log('DEBUG', allowedPerms, perms);
    if (!checkPerms(allowedPerms, perms)) {
      throw new Error('access_forbidden');
    }

    const userPermissions = await listUserPermissions(appId);
    return response({ code: 200, body: { userPermissions } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
