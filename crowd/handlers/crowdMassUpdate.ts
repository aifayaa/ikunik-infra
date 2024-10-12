/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody.js';
import {
  crowdMassUpdateActionSchema,
  crowdMassUpdateBadgesSchema,
  crowdMassUpdateNotifySchema,
} from 'crowd/lib/crowdZodSchemas';
import crowdMassUpdateNotify from 'crowd/lib/crowdMassUpdateNotify';
import crowdMassUpdateBadges from 'crowd/lib/crowdMassUpdateBadges';

export default async (event: APIGatewayProxyEvent) => {
  const {
    appId,
    principalId: userId,
    superAdmin,
  } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
    superAdmin: boolean;
  };

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

    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        'Body is missing from the request'
      );
    }

    const { action } = crowdMassUpdateActionSchema.parse(event.pathParameters);

    let results = null;
    if (action === 'notify') {
      const validatedBody = crowdMassUpdateNotifySchema.parse(
        JSON.parse(event.body)
      );

      results = await crowdMassUpdateNotify(
        appId,
        validatedBody.filters,
        validatedBody.payload,
        validatedBody.notifyAt
      );
    } else if (action === 'addBadges' || action === 'delBadges') {
      const validatedBody = crowdMassUpdateBadgesSchema.parse(
        JSON.parse(event.body)
      );

      results = await crowdMassUpdateBadges(
        appId,
        validatedBody.filters,
        action,
        validatedBody.badgesIds
      );
    } else {
      throw new Error('not_implemented');
    }

    return response({
      code: 200,
      body: formatResponseBody({
        data: results,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
