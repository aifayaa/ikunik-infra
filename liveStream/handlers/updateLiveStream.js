/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import updateLiveStream from '../lib/updateLiveStream';
import checks from '../lib/checks';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const { id: liveStreamId } = event.pathParameters;
    await checkPermsForApp(userId, appId, ['admin']);

    if (!event.body) {
      throw new Error('mal_formed_request');
    }
    const bodyParsed = JSON.parse(event.body);
    const { name, startDateTime } = bodyParsed;

    if (!name || !startDateTime) {
      throw new Error('mal_formed_request');
    }

    if (!checks.name(name, appId) || !checks.startDateTime(startDateTime)) {
      throw new Error('mal_formed_request');
    }

    const results = await updateLiveStream(appId, liveStreamId, {
      name,
      startDateTime,
    });
    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  }
};
