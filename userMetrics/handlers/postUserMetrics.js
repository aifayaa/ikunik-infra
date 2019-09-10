import postUserMetrics from '../lib/postUserMetrics';
import response from '../../libs/httpResponses/response';
import AVAILABLE_TYPES from '../userMetrics.json';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;

  if (!event.body) {
    throw new Error('missing_payload');
  }
  try {
    /* Retrieve body data and parse it */
    const bodyParsed = JSON.parse(event.body);
    const {
      type,
      contentId,
      contentCollection,
      data = {
        startTime: null,
        endTime: null,
        tag: null,
        progression: null,
      },
    } = bodyParsed;

    /* Check all arguments are present */
    if (!type || !contentId || !contentCollection) {
      throw new Error('Missing arguments');
    }

    /* Check arguments types are string */
    [
      appId,
      userId,
      type,
      contentId,
      contentCollection,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('Wrong argument type');
      }
    });

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
        [
          data.startTime,
          data.endTime,
        ].forEach((item) => {
          if (item && typeof item !== 'string') {
            throw new Error('Wrong argument type');
          }
        });
        data.startTime = new Date(data.startTime);
        data.endTime = new Date(data.endTime);
        if (data.endTime < data.startTime) {
          throw new Error('End time must be later than start time');
        }
        break;
      case 'geolocation':
        if (!data.latitude || !data.longitude) {
          throw new Error('Missing arguments');
        }
        [
          data.latitude,
          data.longitude,
        ].forEach((item) => {
          if (item && typeof item !== 'string') {
            throw new Error('Wrong argument type');
          }
        });
        break;
      default: throw new Error('Unsupported type');
    }

    const results = await postUserMetrics(
      appId,
      userId,
      type,
      contentId,
      contentCollection,
      data,
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};

