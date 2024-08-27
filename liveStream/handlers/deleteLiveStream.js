/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import deleteLiveStream from '../lib/deleteLiveStream';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';

export default async (event) => {
  try {
    const {
      appId,
      principalId: userId,
      superAdmin,
    } = event.requestContext.authorizer;
    const { id: liveStreamId } = event.pathParameters;

    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'liveStreams');

      if (!allowed) {
        throw new Error('app_limits_exceeded');
      }
    }

    await checkPermsForApp(userId, appId, ['admin']);

    const results = await deleteLiveStream(appId, liveStreamId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
