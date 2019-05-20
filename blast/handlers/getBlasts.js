import getBlasts from '../lib/getBlasts';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const results = await getBlasts(userId, appId, event.queryStringParameters || {});
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
