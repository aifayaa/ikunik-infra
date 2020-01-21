import getHistory from '../lib/getHistory';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const urlId = event.pathParameters.id;
    const queryParams = event.queryStringParameters || {};

    if (userId !== urlId) {
      return response({ code: 403, message: 'Forbidden' });
    }

    const results = await getHistory(userId, appId, queryParams);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
