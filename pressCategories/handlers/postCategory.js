import errorMessage from '../../libs/httpResponses/errorMessage';
import handlerCategoryChecks from '../lib/handlerCategoryChecks';
import postCategory from '../lib/postCategory';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'pressCategories_all';

export default async (event) => {
  const { appId, perms } = event.requestContext.authorizer;
  const permsParsed = JSON.parse(perms);

  try {
    if (!checkPerms(permKey, permsParsed)) {
      throw new Error('access_forbidden');
    }
    if (!event.body) {
      throw new Error('missing_payload');
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
      badgesAllow,
      picture,
      rssFeedUrl,
    } = parsedBody;
    let { action } = parsedBody;

    /* Encore URI for internal PDF links */
    if (action && action.indexOf('/pdf/') === 0) {
      action = `/pdf/${encodeURIComponent(action.substring(5))}`;
    }

    const results = await postCategory(
      appId,
      name,
      pathName,
      color,
      picture,
      order,
      hidden,
      parentId || null,
      badges || [],
      badgesAllow || 'any',
      action,
      rssFeedUrl,
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
