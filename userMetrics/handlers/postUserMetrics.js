/* eslint-disable import/no-relative-packages */
import postUserMetrics from '../lib/postUserMetrics';
import response from '../../libs/httpResponses/response.ts';
import AVAILABLE_TYPES from '../userMetrics.json';
import { checkAppPlanForLimitIncrease } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';
import getAppActiveUsers from './getAppActiveUsers';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;

  if (!event.body) {
    throw new Error('missing_payload');
  }
  try {
    // Soft limit, do not discard metrics on limit exceeded
    await checkAppPlanForLimitIncrease(appId, 'activeUsers', async (app) => {
      const activeUsers = await getAppActiveUsers(app);
      return activeUsers.count;
    });

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

    const results = await postUserMetrics(appId, {
      contentCollection,
      contentId,
      data,
      deviceId: deviceId || null,
      type,
      userId: userId || null,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
