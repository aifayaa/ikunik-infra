import getAppSettings from '../lib/getAppSettings';
import getPerms from '../../libs/perms/getPerms';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'apps_getInfos';

export default async (event) => {
  const appId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  try {
    const perms = await getPerms(userId, appId);

    if (!checkPerms(permKey, perms)) {
      throw new Error('access_forbidden');
    }

    const results = await getAppSettings(appId, true);

    if (results === false) {
      return response({ code: 404, message: 'app_not_found' });
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
