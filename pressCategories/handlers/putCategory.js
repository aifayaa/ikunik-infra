/* eslint-disable import/no-relative-packages */
import handlerCategoryChecks from '../lib/handlerCategoryChecks';
import putCategory from '../lib/putCategory';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { actionV2ToAction, actionToActionV2 } from '../lib/actionV2Migration';

export default async (event) => {
  const { id: categoryId } = event.pathParameters;
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

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
    let { action = '', action_v2: actionV2 = null } = parsedBody;

    if (!actionV2 && action) {
      actionV2 = actionToActionV2(action);
    } else if (actionV2) {
      action = actionV2ToAction(actionV2);
    }

    /* Encore URI for internal PDF links */
    if (action && action.indexOf('/pdf/') === 0) {
      action = `/pdf/${encodeURIComponent(action.substring(5))}`;
    } else if (!action) {
      action = '';
    }

    const results = await putCategory({
      actionV2,
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
