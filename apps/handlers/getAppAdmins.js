import getAppAdmins from '../lib/getAppAdmins';
import getPerms from '../../libs/perms/getPerms';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import errorMessage from '../../libs/httpResponses/errorMessage';

/** @TODO fix permissions globally, do something, please... */
const permKey = 'apps_getInfos';

export default async (event) => {
  const appId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  try {
    const perms = await getPerms(userId, appId);

    if (!checkPerms(permKey, perms)) {
      throw new Error('access_forbidden');
    }

    const results = await getAppAdmins(appId);

    if (results === false) {
      return response({ code: 404, message: 'app_not_found' });
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
