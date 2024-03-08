/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import handlerCategoryChecks from '../lib/handlerCategoryChecks';
import putCategory from '../lib/putCategory';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { id: categoryId } = event.pathParameters;
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
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
      badges,
      badgesAllow,
      color = null,
      forcedAuthor = null,
      hidden,
      isEvent = false,
      name,
      order = null,
      parentId,
      pathName,
      picture = null,
      reversedFlow = null,
      reversedFlowStart = null,
      rssFeedUrl = null,
    } = parsedBody;
    let { action } = parsedBody;

    /* Encore URI for internal PDF links */
    if (action && action.indexOf('/pdf/') === 0) {
      action = `/pdf/${encodeURIComponent(action.substring(5))}`;
    }

    const results = await putCategory({
      action,
      appId,
      badges: badges || [],
      badgesAllow: badgesAllow || 'any',
      categoryId,
      color,
      forcedAuthor,
      hidden,
      isEvent,
      name,
      order,
      parentId: parentId || null,
      pathName,
      picture,
      reversedFlow,
      reversedFlowStart,
      rssFeedUrl,
    });

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
