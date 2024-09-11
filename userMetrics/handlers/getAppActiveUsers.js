/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { getApp } from '../../apps/lib/appsUtils.ts';
import { getAppActiveUsers } from '../lib/getAppActiveUsers';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  const { period: periodString } = event.queryStringParameters || {
    period: '-1',
  };

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const app = await getApp(appId);

    const period = parseInt(periodString, 10);
    const results = await getAppActiveUsers(app, {
      period,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
