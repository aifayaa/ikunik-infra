/* eslint-disable import/no-relative-packages */
import updatePoll from '../lib/updatePoll';
import { updateFieldChecks } from '../lib/pollsFieldsChecks';
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
  const pollId = event.pathParameters.id;

  try {
    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'polls');

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

    Object.keys(bodyParsed).forEach((field) => {
      const cb = updateFieldChecks[field];

      if (!cb || !cb(bodyParsed[field])) throw new Error('mal_formed_request');
    });

    const poll = await updatePoll(pollId, appId, userId, bodyParsed);
    return response({ code: 200, body: poll });
  } catch (e) {
    return response(errorMessage(e));
  }
};
