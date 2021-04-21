import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import createLiveStream from '../lib/createLiveStream';
import checks from '../lib/checks';

/// @TODO Create a custom permission for this
const permKey = 'pressArticles_all';

export default async (event) => {
  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { appId } = event.requestContext.authorizer;
    if (!checkPerms(permKey, perms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }
    if (!event.body) {
      throw new Error('mal_formed_request');
    }
    const bodyParsed = JSON.parse(event.body);
    const {
      name,
      height,
      width,
      broadcastLocation,
      startDateTime,
      endDateTime,
    } = bodyParsed;

    if (
      !name ||
      !height ||
      !width ||
      !broadcastLocation ||
      !startDateTime ||
      !endDateTime
    ) {
      throw new Error('mal_formed_request');
    }

    if (
      !checks.streamSize(width, height) ||
      !checks.broadcastLocation(broadcastLocation) ||
      !checks.name(name, appId) ||
      !checks.startEndDateTime(startDateTime, endDateTime)
    ) {
      throw new Error('mal_formed_request');
    }

    const results = await createLiveStream(appId, {
      name,
      height,
      width,
      broadcastLocation,
      startDateTime,
      endDateTime,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
