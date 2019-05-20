import response from '../../libs/httpResponses/response';
import { doDeleteUserSelectionTree } from '../libs/doDeleteUserSelection';

export default async (event, _context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    callback(null, response({ code: 403, message: 'Forbiden' }));
    return;
  }
  try {
    const { selectionId } = event.pathParameters;
    await doDeleteUserSelectionTree(userId, selectionId, appId);
    callback(null, response({ code: 200, body: true }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
