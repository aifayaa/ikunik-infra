import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import getCategories from '../lib/getCategories';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const {
    start,
    limit,
    countOnly = '',
    fetchMaxOrder = '',
  } = event.queryStringParameters || {};
  const isCountOnly = countOnly.toLowerCase() === 'true';
  const isFetchMaxOrder = fetchMaxOrder.toLowerCase() === 'true';

  try {
    const results = await getCategories(appId, false, {
      countOnly: isCountOnly,
      fetchMaxOrder: isFetchMaxOrder,
      parentId: null,
      start,
      limit,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
