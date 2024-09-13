/* eslint-disable import/no-relative-packages */
import postUserMetrics from '../lib/postUserMetrics';
import response from '../../libs/httpResponses/response.ts';
import AVAILABLE_TYPES from '../userMetrics.json';
import { getAppActiveUsers } from '../lib/getAppActiveUsers';
import { getApp } from '../../apps/lib/appsUtils.ts';
import { sendMAULimitWarningEmailIfNecessary } from '../../appsFeaturePlans/lib/utils.ts';
// import { sendMAULimitWarningEmailIfNecessary } from './sendMAULimitWarningEmailIfNecessary.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  if (!event.body) {
    throw new Error('missing_payload');
  }
  try {
    /* Retrieve body data and parse it */
    const bodyParsed = JSON.parse(event.body);
    const {
      contentCollection,
      contentId,
      data = {
        startTime: null,
        endTime: null,
        tag: null,
        progression: null,
      },
      deviceId,
      type,
    } = bodyParsed;

    /* Check all arguments are present */
    if ((!userId && !deviceId) || !type || !contentId || !contentCollection) {
      throw new Error('Missing arguments');
    }

    /* Check arguments types are string */
    [appId, contentCollection, contentId, deviceId, type, userId].forEach(
      (item) => {
        if (item && typeof item !== 'string') {
          throw new Error('Wrong argument type');
        }
      }
    );

    /* Check this type exists */
    if (typeof AVAILABLE_TYPES[type] === 'undefined') {
      throw new Error('Wrong type value');
    }

    /* Check required data is present for this type */
    switch (type) {
      case 'time':
        if (!data.startTime || !data.endTime) {
          throw new Error('Missing arguments');
        }
        [data.startTime, data.endTime].forEach((item) => {
          if (item && typeof item !== 'string') {
            throw new Error('Wrong argument type');
          }
        });

        if (new Date(data.endTime) < new Date(data.startTime)) {
          throw new Error('End time must be later than start time');
        }
        break;
      case 'geolocation':
        if (!data.latitude || !data.longitude) {
          throw new Error('Missing arguments');
        }
        [data.latitude, data.longitude].forEach((item) => {
          if (item && typeof item !== 'number') {
            throw new Error('Wrong argument type');
          }
        });
        data.location = [data.longitude, data.latitude];
        delete data.longitude;
        delete data.latitude;
        break;
      default:
        throw new Error('Unsupported type');
    }

    const app = await getApp(appId);
    const activeUsersBefore = await getAppActiveUsers(app);

    const results = await postUserMetrics(appId, {
      contentCollection,
      contentId,
      data,
      deviceId: deviceId || null,
      type,
      userId: userId || null,
    });

    const activeUsersAfter = await getAppActiveUsers(app);

    // Send a mail the application administrator if they must be warn regarding
    // the number of active users
    await sendMAULimitWarningEmailIfNecessary(
      app,
      activeUsersBefore.count,
      activeUsersAfter.count
    );

    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
