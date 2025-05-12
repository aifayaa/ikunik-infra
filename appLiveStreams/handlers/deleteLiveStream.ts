/* eslint-disable import/no-relative-packages */
import response, {
  handleException,
} from '../../libs/httpResponses/response.js';
import errorMessage from '../../libs/httpResponses/errorMessage.js';
import deleteLiveStream from '../lib/deleteLiveStream.js';
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '../../libs/perms/checkPermsFor.js';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.js';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.js';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes.js';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody.js';
import { filterAppLiveStreamOutput } from 'appLiveStreams/lib/utils.js';

export default async (event: APIGatewayProxyEvent) => {
  try {
    const {
      appId,
      principalId: userId,
      superAdmin,
    } = event.requestContext.authorizer as {
      appId: string;
      principalId: string;
      superAdmin: boolean;
    };
    const { id: liveStreamId } = event.pathParameters as { id: string };

    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'liveStreams');

      if (!allowed) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
          `The current plan for app '${appId}' does not allow this operation`
        );
      }
    }

    try {
      await checkFeaturePermsForApp(userId, appId, ['appLiveStreaming']);
    } catch (e) {
      await checkPermsForApp(userId, appId, ['admin']);
    }

    const deletedStream = await deleteLiveStream(appId, liveStreamId);
    return response({
      code: 200,
      body: formatResponseBody({
        data: filterAppLiveStreamOutput(deletedStream),
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
