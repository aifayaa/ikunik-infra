import errorMessage from '../../libs/httpResponses/errorMessage';
import getCategories from '../lib/getCategories';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'pressCategories_all';
export default async (event) => {
  const { appId, perms, principalId: userId } = event.requestContext.authorizer;
  const permsParsed = JSON.parse(perms);
  const {
    fetchMaxOrder: fetchMaxOrderParameter = '',
  } = event.queryStringParameters || {};
  let { parentId } = event.queryStringParameters || {};
  const fetchMaxOrder = fetchMaxOrderParameter.toLowerCase() === 'true';

  try {
    if (!checkPerms(permKey, permsParsed)) {
      throw new Error('access_forbidden');
    }

    if (parentId === 'null') {
      parentId = null;
    }

    const results = await getCategories(appId, true, {
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
