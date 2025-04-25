/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import deleteLiveStream from '../lib/deleteLiveStream';
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '../../libs/perms/checkPermsFor.ts';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes.ts';

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
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
          `The current plan for app '${appId}' does not allow this operation`
        );
      }
    }

    try {
      await checkFeaturePermsForApp(userId, appId, ['appLiveStreaming']);
    } catch (e) {
      await checkPermsForApp(userId, appId, ['admin']);
    }

    const results = await deleteLiveStream(appId, liveStreamId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
