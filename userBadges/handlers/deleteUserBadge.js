/* eslint-disable import/no-relative-packages */
import deleteUserBadge from '../lib/deleteUserBadge';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';

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
        throw new Error('app_limits_exceeded');
      }
    }

    await deleteUserBadge(userBadgeId, appId);
    return response({ code: 200, body: { ok: true } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
