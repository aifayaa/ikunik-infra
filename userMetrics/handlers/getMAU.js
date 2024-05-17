/* eslint-disable import/no-relative-packages */
import getMAU from '../lib/getMAU';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const {
    month = oneMonthAgo.getMonth() + 1,
    year = oneMonthAgo.getFullYear(),
  } = event.queryStringParameters || {};

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const results = await getMAU(appId, {
      month,
      year,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
