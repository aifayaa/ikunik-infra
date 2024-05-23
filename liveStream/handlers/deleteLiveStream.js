/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import deleteLiveStream from '../lib/deleteLiveStream';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const { id: liveStreamId } = event.pathParameters;
    await checkPermsForApp(userId, appId, ['admin']);

    const results = await deleteLiveStream(appId, liveStreamId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
