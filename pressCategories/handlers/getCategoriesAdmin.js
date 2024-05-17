/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import getCategories from '../lib/getCategories';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { fetchMaxOrder: fetchMaxOrderParameter = '' } =
    event.queryStringParameters || {};
  let { parentId } = event.queryStringParameters || {};
  const fetchMaxOrder = fetchMaxOrderParameter.toLowerCase() === 'true';

  try {
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    if (parentId === 'null') {
      parentId = null;
    }

    const results = await getCategories(appId, true, {
      checkBadges: false,
      fetchMaxOrder,
      limit: -1,
      parentId,
      start: 0,
      userId,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
