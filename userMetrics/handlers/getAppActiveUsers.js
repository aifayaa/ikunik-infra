/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { getApp } from '../../apps/lib/appsUtils.ts';
import { getAppActiveUsers } from '../lib/getAppActiveUsers';

function parseDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getFullYear())) return null;

  return date;
}

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  const {
    period: periodString = '-1',
    from: fromDate = null,
    to: toDate = null,
  } = event.queryStringParameters || {};

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const app = await getApp(appId);

    const period = parseInt(periodString, 10);
    const results = await getAppActiveUsers(app, {
      period,
      fromDate: parseDate(fromDate),
      toDate: parseDate(toDate),
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
