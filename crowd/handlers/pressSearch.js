/* eslint-disable import/no-relative-packages */
import buildPressPipeline from '../lib/pipelines/pressPipeline';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import searchPress from '../lib/pressSearch';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes.ts';

export default async (event) => {
  const { queryStringParameters = {} } = event;
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

    queryStringParameters.filterUserInfo = true;
    await checkPermsForApp(userId, appId, ['admin']);

    const pipeline = buildPressPipeline(userId, appId, queryStringParameters);
    const results = await searchPress(pipeline, appId, queryStringParameters);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
