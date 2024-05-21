/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import refreshLiveStream from '../lib/refreshLiveStream';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const { id: liveStreamId } = event.pathParameters;
    await checkPermsForApp(userId, appId, ['admin']);

    const results = await refreshLiveStream(appId, liveStreamId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
