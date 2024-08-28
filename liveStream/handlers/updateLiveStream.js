/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import updateLiveStream from '../lib/updateLiveStream';
import checks from '../lib/checks';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
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

    await checkPermsForApp(userId, appId, ['admin']);

    if (!event.body) {
      throw new Error('mal_formed_request');
    }
    const bodyParsed = JSON.parse(event.body);
    const { name, startDateTime } = bodyParsed;

    if (!name || !startDateTime) {
      throw new Error('mal_formed_request');
    }

    if (!checks.name(name, appId) || !checks.startDateTime(startDateTime)) {
      throw new Error('mal_formed_request');
    }

    const results = await updateLiveStream(appId, liveStreamId, {
      name,
      startDateTime,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
