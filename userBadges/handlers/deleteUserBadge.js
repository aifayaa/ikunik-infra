/* eslint-disable import/no-relative-packages */
import deleteUserBadge from '../lib/deleteUserBadge';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import checkAppPlanForLimits from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const userBadgeId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const allowed = await checkAppPlanForLimits(appId, 'badges', () => {
      // We check for hard limits only and block them
      return Promise.resolve(0);
    });

    if (!allowed) {
      throw new Error('app_limits_exceeded');
    }

    await deleteUserBadge(userBadgeId, appId);
    return response({ code: 200, body: { ok: true } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
