/* eslint-disable import/no-relative-packages */
import buildPressPipeline from '../lib/pipelines/pressPipeline';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import searchPress from '../lib/pressSearch';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';

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
        throw new Error('app_limits_exceeded');
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
