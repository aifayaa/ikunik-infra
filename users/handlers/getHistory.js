import getHistory from '../lib/getHistory';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const urlId = event.pathParameters.id;
    const queryParams = event.queryStringParameters || {};

    if (userId !== urlId) {
      callback(null, response({ code: 403, message: 'Forbidden' }));
      return;
    }

    const results = await getHistory(userId, appId, queryParams);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
