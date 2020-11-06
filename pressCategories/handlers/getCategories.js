import errorMessage from '../../libs/httpResponses/errorMessage';
import getCategories from '../lib/getCategories';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const { start, limit, countOnly } = event.queryStringParameters || {};
  const isCountOnly = countOnly.toLowerCase() === 'true';

  try {
    const results = await getCategories(appId, false, {
      start,
      limit,
      countOnly: isCountOnly,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
