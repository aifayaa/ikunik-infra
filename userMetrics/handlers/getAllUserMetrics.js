/* eslint-disable import/no-relative-packages */
import getAllUserMetrics from '../lib/getAllUserMetrics';
import response from '../../libs/httpResponses/response.ts';
import AVAILABLE_TYPES from '../userMetrics.json';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const {
    userId = null,
    type = null,
    contentId = null,
    contentCollection = null,
    start = '0',
    limit = '10',
    startTime = null,
    endTime = null,
    latitude = null,
    longitude = null,
    range = null,
  } = event.queryStringParameters || {};

  try {
    [
      userId,
      type,
      contentId,
      contentCollection,
      start,
      limit,
      startTime,
      endTime,
      latitude,
      longitude,
      range,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('Wrong argument type');
      }
    });

    // eslint-disable-next-line eqeqeq
    if (parseInt(start, 10) != start) {
      throw new Error('Wrong argument type');
    }

    // eslint-disable-next-line eqeqeq
    if (parseInt(limit, 10) != limit) {
      throw new Error('Wrong argument type');
    }

    if (start < 0) {
      throw new Error('Start cannot be less than zero');
    }

    if (limit < 1) {
      throw new Error('Limit cannot be less than one');
    }

    if (type && AVAILABLE_TYPES[type] === undefined) {
      throw new Error('This type is not available');
    }

    if (userId) {
      // check if user exists
      // throw new Error('This type is not available');
    }

    const results = await getAllUserMetrics(
      appId,
      userId,
      type,
      contentId,
      contentCollection,
      start,
      limit,
      startTime,
      endTime,
      latitude,
      longitude,
      range
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
