/* eslint-disable import/no-relative-packages */
import getIapPoll from '../lib/getIapPoll';
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
  const iapPollId = event.pathParameters.id;
  const params = event.queryStringParameters || {};

  try {
    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'iapPolls');

      if (!allowed) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
          `The current plan for app '${appId}' does not allow this operation`
        );
      }
    }

    const isAdmin = await checkPermsForApp(userId, appId, ['admin'], {
      dontThrow: true,
    });

    let iapPoll = await getIapPoll(iapPollId, appId, {
      userId,
      deviceId: params.deviceId,
    });

    if (!isAdmin) {
      const publicFields = [
        '_id',
        'allVotes',
        'canUpdate',
        'description',
        'displayResults',
        'endDate',
        'multipleChoices',
        'myVotes',
        'options',
        'requires',
        'startDate',
        'title',
      ];

      iapPoll = publicFields.reduce((acc, key) => {
        acc[key] = iapPoll[key];
        return acc;
      }, {});
    }

    return response({ code: 200, body: iapPoll });
  } catch (e) {
    return response(errorMessage(e));
  }
};
