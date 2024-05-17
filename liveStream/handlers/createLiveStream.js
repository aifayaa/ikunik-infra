/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import createLiveStream from '../lib/createLiveStream';
import checks from '../lib/checks';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      return response({ code: 403, message: 'access_forbidden' });
    }
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

    const results = await createLiveStream(appId, {
      name,
      startDateTime,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
