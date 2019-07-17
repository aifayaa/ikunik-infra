import { checkPerms } from '../../libs/perms/checkPerms';
import removeCategory from '../lib/removeCategory';
import response from '../../libs/httpResponses/response';

const permKey = 'pressCategories_all';

export default async (event) => {
  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { appId } = event.requestContext.authorizer;
    if (!checkPerms(permKey, perms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }
    const categoryId = event.pathParameters.id;
    const results = await removeCategory(appId, categoryId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
