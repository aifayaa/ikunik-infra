import errorMessage from '../../libs/httpResponses/errorMessage';
import getCategories from '../lib/getCategories';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'pressCategories_all';
export default async (event) => {
  const { appId, perms } = event.requestContext.authorizer;
  const permsParsed = JSON.parse(perms);
  let { parentId } = event.queryStringParameters || {};

  try {
    if (!checkPerms(permKey, permsParsed)) {
      throw new Error('access_forbidden');
    }

    if (parentId === 'null') {
      parentId = null;
    }

    const results = await getCategories(appId, true, { start: 0, limit: -1, parentId });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
