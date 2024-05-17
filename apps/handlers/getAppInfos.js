/* eslint-disable import/no-relative-packages */
import getAppInfos from '../lib/getAppInfos';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const appId = event.pathParameters.id;
  const { principalId: userId } = event.requestContext.authorizer;

  try {
    const havePerms = await checkPermsForApp(userId, appId, 'admin');

    const results = await getAppInfos(appId, havePerms);

    if (results === false) {
      return response({ code: 404, message: 'app_not_found' });
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
