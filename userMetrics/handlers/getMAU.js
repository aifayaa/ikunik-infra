/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import getMAU from '../lib/getMAU';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'pressCategories_all';

export default async (event) => {
  const { appId, perms } = event.requestContext.authorizer;
  const permsParsed = JSON.parse(perms);

  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const { month = now.getMonth() + 1, year = now.getFullYear() } =
    event.queryStringParameters || {};

  try {
    if (!checkPerms(permKey, permsParsed)) {
      throw new Error('access_forbidden');
    }

    const results = await getMAU(appId, {
      month,
      year,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
