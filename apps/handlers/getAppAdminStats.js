/* eslint-disable import/no-relative-packages */
import getAppAdminStats from '../lib/getAppAdminStats';
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const results = await getAppAdminStats(appId);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
