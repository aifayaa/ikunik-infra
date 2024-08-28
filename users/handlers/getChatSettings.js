/* eslint-disable import/no-relative-packages */
import getChatSettings from '../lib/getChatSettings';
import response from '../../libs/httpResponses/response.ts';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes.ts';

export default async (event) => {
  const { superAdmin } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;

  try {
    if (userId !== urlId) {
      throw new Error('Forbidden');
    }

    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'chat');
      if (!allowed) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
          `The current plan for app '${appId}' does not allow this operation`
        );
      }
    }

    const settings = await getChatSettings(userId, appId);
    if (!settings) {
      return response({ code: 503, message: 'service_unavailable' });
    }
    return response({ code: 200, body: settings });
  } catch (e) {
    let code = 500;
    switch (e.message) {
      case 'Forbidden':
        code = 403;
        break;
      default:
        code = 500;
        break;
    }
    return response({ code, message: e.message });
  }
};
