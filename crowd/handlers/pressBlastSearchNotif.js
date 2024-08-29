/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { ObjectID } from '../../libs/mongoClient';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes.ts';

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
      const allowed = await checkAppPlanForLimitAccess(appId, 'crowd');

      if (!allowed) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
          `The current plan for app '${appId}' does not allow this operation`
        );
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
