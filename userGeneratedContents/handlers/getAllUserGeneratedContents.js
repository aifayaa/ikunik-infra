import getAllUserGeneratedContents from '../lib/getAllUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import AVAILABLE_TYPES from '../userGeneratedContentsTypes.json';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const {
    countOnly = false,
    limit,
    moderated = undefined,
    raw,
    reported = false,
    start,
    type,
    userId,
  } = event.queryStringParameters || {};

  try {
    // eslint-disable-next-line eqeqeq
    if (start && parseInt(start, 10) != start) {
      throw new Error('Wrong argument type');
    }

    // eslint-disable-next-line eqeqeq
    if (limit && parseInt(limit, 10) != limit) {
      throw new Error('Wrong argument type');
    }

    if (type && AVAILABLE_TYPES[type] === undefined) {
      throw new Error('This type is not available');
    }

    if (raw && (['true', 'false'].indexOf(raw)) === undefined) {
      throw new Error('Wrong argument type status');
    }

    if (userId) {
      // check if user exists
      // throw new Error('This type is not available');
    }

    const isRaw = raw !== 'false';
    const { items, totalCount } = await getAllUserGeneratedContents(
      appId,
      start,
      limit,
      type,
      userId,
      {
        countOnly: countOnly && !isRaw,
        moderated: typeof moderated !== 'undefined' ? moderated === 'true' : moderated,
        reported,
        raw: isRaw,
      },
    );
    let body;
    if (isRaw) {
      body = items;
    } else {
      body = { totalCount };
      if (!countOnly) {
        body.items = items;
      }
    }
    return response({ code: 200, body });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
