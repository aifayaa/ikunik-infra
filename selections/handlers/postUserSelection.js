import createUserSelection from '../libs/createUserSelection';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    callback(null, response({ code: 403, message: 'Forbiden' }));
    return;
  }
  try {
    const { name, parent } = JSON.parse(event.body);
    if (!name) {
      throw new Error('malformed request');
    }
    const results = await createUserSelection(name, userId, parent, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
