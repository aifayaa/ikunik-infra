import errorMessage from '../../libs/httpResponses/errorMessage';
import handlerCategoryChecks from '../lib/handlerCategoryChecks';
import putCategory from '../lib/putCategory';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'pressCategories_all';

export default async (event) => {
  const { id: categoryId } = event.pathParameters;
  const { appId, perms } = event.requestContext.authorizer;
  const permsParsed = JSON.parse(perms);

  try {
    if (!checkPerms(permKey, permsParsed)) {
      throw new Error('access_forbidden');
    }
    if (!event.body) {
      throw new Error('malformed_request');
    }
    if (!categoryId) {
      throw new Error('missing_argument');
    }
    if (typeof categoryId !== 'string') {
      throw new Error('wrong_argument_type');
    }
    const parsedBody = JSON.parse(event.body);
    handlerCategoryChecks(parsedBody);
    const {
      color,
      hidden,
      name,
      order,
      parentId,
      pathName,
      badges,
      picture,
    } = parsedBody;
    let { action } = parsedBody;

    /* Encore URI for internal PDF links */
    if (action && action.indexOf('/pdf/') === 0) {
      action = `/pdf/${encodeURIComponent(action.substring(5))}`;
    }

    const results = await putCategory(
      appId,
      categoryId,
      name,
      pathName,
      color,
      picture,
      order,
      hidden,
      parentId || null,
      badges || [],
      action,
    );

    if (results === false) {
      return response({ code: 404, message: 'category_not_found' });
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
