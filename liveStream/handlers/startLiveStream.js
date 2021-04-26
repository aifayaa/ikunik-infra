import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import errorMessage from '../../libs/httpResponses/errorMessage';
import startStopLiveStream from '../lib/startStopLiveStream';

/// @TODO Create a custom permission for this
const permKey = 'pressArticles_all';

export default async (event) => {
  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { appId } = event.requestContext.authorizer;
    const { id: liveStreamId } = event.pathParameters;
    if (!checkPerms(permKey, perms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }

    const results = await startStopLiveStream(appId, liveStreamId, true);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
