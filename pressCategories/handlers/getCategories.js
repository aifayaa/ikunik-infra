/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import getCategories from '../lib/getCategories';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { start, limit, countOnly = '' } = event.queryStringParameters || {};
  const isCountOnly = countOnly.toLowerCase() === 'true';

  try {
    const results = await getCategories(appId, false, {
      countOnly: isCountOnly,
      parentId: null,
      start,
      limit,
      userId,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
