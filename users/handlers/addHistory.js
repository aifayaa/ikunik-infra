import addHistory from '../lib/addHistory';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  if (userId !== urlId) {
    callback(null, response({ code: 403, message: 'Forbidden' }));
    return;
  }
  try {
    const { id } = JSON.parse(event.body);
    if (!id) {
      throw new Error('Bad arguments');
    }
    const results = await addHistory(userId, id, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
