/* eslint-disable import/no-relative-packages */
import searchUser from '../lib/searchUser';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes.ts';

export default async (event) => {
  const {
    appId,
    principalId: userId,
    superAdmin,
  } = event.requestContext.authorizer;

  try {
    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'crowd');

      if (!allowed) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
          `The current plan for app '${appId}' does not allow this operation`
        );
      }
    }

    await checkPermsForApp(userId, appId, ['admin']);

    const {
      limit,
      onlyPendingBadges,
      onlyRejectedBadges,
      search,
      sortBy,
      sortOrder,
      start,
      userId: searchUserId,
    } = event.queryStringParameters || {};
    const results = await searchUser(appId, {
      limit,
      onlyPendingBadges: onlyPendingBadges === 'true',
      onlyRejectedBadges: onlyRejectedBadges === 'true',
      search,
      sortBy,
      sortOrder,
      start,
      userId: searchUserId,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
