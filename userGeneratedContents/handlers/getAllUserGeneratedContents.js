import getAllUserGeneratedContents from '../lib/getAllUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import AVAILABLE_TYPES from '../userGeneratedContentsTypes.json';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const {
    countOnly = false,
    limit,
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

    if (userId) {
      // check if user exists
      // throw new Error('This type is not available');
    }

    const { results, total } = await getAllUserGeneratedContents(
      appId,
      start,
      limit,
      type,
      userId,
      {
        countOnly,
        reported,
      },
    );
    return response({ code: 200, body: countOnly ? total : results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
