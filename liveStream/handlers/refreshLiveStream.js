/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import refreshLiveStream from '../lib/refreshLiveStream';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const { id: liveStreamId } = event.pathParameters;
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      return response({ code: 403, message: 'access_forbidden' });
    }

    const results = await refreshLiveStream(appId, liveStreamId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
