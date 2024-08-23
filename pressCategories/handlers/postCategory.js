/* eslint-disable import/no-relative-packages */
import handlerCategoryChecks from '../lib/handlerCategoryChecks';
import postCategory from '../lib/postCategory';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { actionV2ToAction, actionToActionV2 } from '../lib/actionV2Migration';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    if (!event.body) {
      throw new Error('missing_payload');
    }
    const parsedBody = JSON.parse(event.body);
    handlerCategoryChecks(parsedBody);
    const {
      badgesAllow,
      color,
      forcedAuthor,
      hidden,
      isEvent = false,
      name,
      order,
      parentId,
      pathName,
      picture,
      reversedFlow,
      reversedFlowStart,
      rssFeedUrl,
    } = parsedBody;
    let { badges, action = '', action_v2: actionV2 = null } = parsedBody;

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

    const allowed = await checkAppPlanForLimitAccess(appId, 'badges');
    if (!allowed) {
      badges = [];
    }

    const results = await postCategory({
      action,
      actionV2,
      appId,
      badges: badges || [],
      badgesAllow: badgesAllow || 'any',
      color,
      forcedAuthor: forcedAuthor || null,
      hidden,
      isEvent,
      name,
      order,
      parentId: parentId || null,
      pathName,
      picture,
      reversedFlow: reversedFlow || false,
      reversedFlowStart: reversedFlowStart || 0,
      rssFeedUrl,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
