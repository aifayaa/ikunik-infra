import getUserRootSelections from '../libs/getUserRootSelection';
import getUserSelections from '../libs/getUserSelections';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;
  const { rootOnly } = event.queryStringParameters || {};
  if (userId !== urlId) {
    callback(null, response({ code: 403, message: 'Forbiden' }));
    return;
  }
  try {
    let results;
    if (rootOnly) results = await getUserRootSelections(userId, appId);
    else results = await getUserSelections(userId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
