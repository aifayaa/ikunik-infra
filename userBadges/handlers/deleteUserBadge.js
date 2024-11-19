/* eslint-disable import/no-relative-packages */
import deleteUserBadge from '../lib/deleteUserBadge';
import errorMessage from '../../libs/httpResponses/errorMessage';
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
  const userBadgeId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'badges');

      if (!allowed) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
          `The current plan for app '${appId}' does not allow this operation`
        );
      }
    }

    await deleteUserBadge(userBadgeId, appId);
    return response({ code: 200, body: { ok: true } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
