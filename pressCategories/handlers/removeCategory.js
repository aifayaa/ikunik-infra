import errorMessage from '../../libs/httpResponses/errorMessage';
import removeCategory from '../lib/removeCategory';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'pressCategories_all';

export default async (event) => {
  const { id: categoryId } = event.pathParameters;
  const { appId, perms } = event.requestContext.authorizer;
  const permsParsed = JSON.parse(perms);

  try {
    if (!checkPerms(permKey, permsParsed)) {
      return response({ code: 403, message: 'access_forbidden' });
    }
    if (!categoryId) {
      throw new Error('missing_argument');
    }
    if (typeof categoryId !== 'string') {
      throw new Error('wrong_argument_type');
    }
    const results = await removeCategory(appId, categoryId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
