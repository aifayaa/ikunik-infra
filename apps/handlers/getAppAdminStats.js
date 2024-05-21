/* eslint-disable import/no-relative-packages */
import getAppAdminStats from '../lib/getAppAdminStats';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const results = await getAppAdminStats(appId);

    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  }
};
