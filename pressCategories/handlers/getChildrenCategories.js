import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import getCategories from '../lib/getCategories';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const { start, limit } = event.queryStringParameters || {};
  const { id: parentId } = event.pathParameters;

  try {
    const results = await getCategories(appId, false, {
      start,
      limit,
      parentId,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
