/* eslint-disable import/no-relative-packages */
import listUserBadges from '../lib/listUserBadges';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { checkAppPlanForLimitUpdate } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const allowed = await checkAppPlanForLimitUpdate(appId, 'badges');

    if (!allowed) {
      throw new Error('app_limits_exceeded');
    }

    const userBadges = await listUserBadges(appId);
    return response({ code: 200, body: { userBadges } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
