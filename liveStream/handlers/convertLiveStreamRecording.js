import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import errorMessage from '../../libs/httpResponses/errorMessage';
import convertLiveStreamRecording from '../lib/convertLiveStreamRecording';

/// @TODO Create a custom permission for this
const permKey = 'pressArticles_all';

export default async (event) => {
  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { appId } = event.requestContext.authorizer;
    const { id: liveStreamId } = event.pathParameters;
    const {
      recordingRoot,
    } = event.queryStringParameters || {};

    if (!checkPerms(permKey, perms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }
    if (!recordingRoot) {
      return response({ code: 400, message: 'missing_payload' });
    }

    const success = await convertLiveStreamRecording(appId, liveStreamId, recordingRoot);
    return response({ code: 200, body: { ok: success } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
