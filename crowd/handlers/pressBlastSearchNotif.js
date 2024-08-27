/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { ObjectID } from '../../libs/mongoClient';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';

const { REGION, STAGE } = process.env;

const lambda = new Lambda({
  region: REGION,
});

export default async (event) => {
  const {
    appId,
    principalId: userId,
    superAdmin,
  } = event.requestContext.authorizer;

  try {
    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'community');

      if (!allowed) {
        throw new Error('app_limits_exceeded');
      }
    }

    await checkPermsForApp(userId, appId, ['admin']);
    const { title, message, limit } = JSON.parse(event.body);

    if (!(title && message && typeof limit !== 'undefined')) {
      throw new Error('missing_argument');
    }

    if (
      !(
        typeof title === 'string' &&
        typeof message === 'string' &&
        Number.isInteger(limit)
      )
    ) {
      throw new Error('wrong_argument_type');
    }

    const operationId = ObjectID();

    const params = {
      InvocationType: 'Event',
      FunctionName: `blast-${STAGE}-pressBlastNotif`,
      Payload: JSON.stringify({
        appId,
        limit,
        message,
        operationId,
        searchParameters: event.queryStringParameters,
        title,
        userId,
      }),
    };

    await lambda.invoke(params).promise();
    return response({ code: 200, body: { operationId } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
