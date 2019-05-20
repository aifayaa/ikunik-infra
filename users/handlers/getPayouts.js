import getPayouts from '../lib/getPayouts';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  const { appId, profileId } = event.requestContext.authorizer;
  if (userId !== urlId) {
    callback(null, response({ code: 403, message: 'Forbidden' }));
    return;
  }
  try {
    const results = await getPayouts(userId, profileId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
