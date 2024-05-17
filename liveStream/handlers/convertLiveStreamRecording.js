/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import convertLiveStreamRecording from '../lib/convertLiveStreamRecording';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const { id: liveStreamId } = event.pathParameters;
    const { recordingRoot } = event.queryStringParameters || {};

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
  } catch (exception) {
    return handleException(exception);
  }
};
