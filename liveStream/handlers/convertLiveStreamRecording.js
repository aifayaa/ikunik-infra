/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import convertLiveStreamRecording from '../lib/convertLiveStreamRecording';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';

export default async (event) => {
  try {
    const {
      appId,
      principalId: userId,
      superAdmin,
    } = event.requestContext.authorizer;

    const { id: liveStreamId } = event.pathParameters;
    const { recordingRoot } = event.queryStringParameters || {};

    if (!superAdmin) {
      const allowed = await checkAppPlanForLimitAccess(appId, 'liveStreams');

      if (!allowed) {
        throw new Error('app_limits_exceeded');
      }
    }

    await checkPermsForApp(userId, appId, ['admin']);

    if (!recordingRoot) {
      return response({ code: 400, message: 'missing_payload' });
    }

    const success = await convertLiveStreamRecording(
      appId,
      liveStreamId,
      recordingRoot
    );
    return response({ code: 200, body: { ok: success } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
