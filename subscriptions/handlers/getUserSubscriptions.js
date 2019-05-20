import getUserSubscriptions from '../lib/getUserSubscriptions';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  const { appId } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    callback(null, response({ code: 403, message: 'Forbidden' }));
    return;
  }
  try {
    const results = await getUserSubscriptions(userId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
