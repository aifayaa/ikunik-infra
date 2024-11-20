/* eslint-disable import/no-relative-packages */
import getIapPolls from '../lib/getIapPolls';
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

    const params = event.queryStringParameters || {};
    const isAdmin = await checkPermsForApp(userId, appId, ['admin'], {
      dontThrow: true,
    });

    const filters = {};

    const { start = 0, limit = 25 } = params;

    filters.start = parseInt(start, 10);
    filters.limit = parseInt(limit, 10);

    if (isAdmin) {
      if (params.search) filters.search = params.search;
    }

    const iapPolls = await getIapPolls(appId, filters);
    const { count } = iapPolls;
    let { list } = iapPolls;

    if (!isAdmin) {
      const publicFields = [
        '_id',
        'canUpdate',
        'description',
        'displayResults',
        'endDate',
        'multipleChoices',
        'options',
        'requires',
        'startDate',
        'title',
      ];

      list = list.map((item) =>
        publicFields.reduce((acc, key) => {
          acc[key] = item[key];
          return acc;
        }, {})
      );
    }

    return response({ code: 200, body: { list, count } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
