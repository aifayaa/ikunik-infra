/* eslint-disable import/no-relative-packages */
import getPoll from '../lib/getPoll';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';

export default async (event) => {
  const {
    appId,
    principalId: userId,
    superAdmin,
  } = event.requestContext.authorizer;
  const pollId = event.pathParameters.id;
  const params = event.queryStringParameters || {};

  try {
    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'polls');

      if (!allowed) {
        throw new Error('app_limits_exceeded');
      }
    }

    const isAdmin = await checkPermsForApp(userId, appId, ['admin'], {
      dontThrow: true,
    });

    let poll = await getPoll(pollId, appId, {
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

      poll = publicFields.reduce((acc, key) => {
        acc[key] = poll[key];
        return acc;
      }, {});
    }

    return response({ code: 200, body: poll });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
