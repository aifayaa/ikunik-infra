/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import refreshLiveStream from '../lib/refreshLiveStream';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const { id: liveStreamId } = event.pathParameters;
    await checkPermsForApp(userId, appId, ['admin']);

    const results = await refreshLiveStream(appId, liveStreamId);
    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  }
};
