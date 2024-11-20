/* eslint-disable import/no-relative-packages */
import getPollResults, { pollResultsToCsv } from '../lib/getPollResults';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { getUserLanguage, intlInit } from '../../libs/intl/intl';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes.ts';

export default async (event) => {
  const {
    appId: authorizerAppId,
    principalId: userId,
    superAdmin,
  } = event.requestContext.authorizer;
  const pollId = event.pathParameters.id;

  try {
    const isAdmin = await checkPermsForApp(userId, authorizerAppId, ['admin'], {
      dontThrow: true,
    });

    const { exportToken = null, appId } = event.queryStringParameters || {};

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

    if (!superAdmin && !exportToken && !isAdmin) {
      throw new Error('access_forbidden');
    }

    const lang = getUserLanguage(event.headers);

    const pollResults = await getPollResults(pollId, appId, { exportToken });

    await intlInit(lang);

    const csv = pollResultsToCsv(pollResults);
    return response({
      code: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
      },
      body: csv,
      raw: true,
    });
  } catch (e) {
    return response(errorMessage(e));
  }
};
