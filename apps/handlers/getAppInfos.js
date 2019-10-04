import getAppInfos from '../lib/getAppInfos';
import response from '../../libs/httpResponses/response';
import getPerms from '../../libs/perms/getPerms';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'apps_getInfos';

export default async (event) => {
  const appId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  const perms = await getPerms(userId, appId);
  if (!checkPerms(permKey, perms)) {
    return response({ code: 403, message: 'access_forbidden' });
  }

  try {
    const results = await getAppInfos(appId);

    if (results === false) {
      return response({ code: 404, message: 'app_not_found' });
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
