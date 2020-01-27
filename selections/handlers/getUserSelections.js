import getUserRootSelections from '../libs/getUserRootSelection';
import getUserSelections from '../libs/getUserSelections';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;
  const { rootOnly } = event.queryStringParameters || {};
  if (userId !== urlId) {
    return response({ code: 403, message: 'Forbiden' });
  }
  try {
    let results;
    if (rootOnly) results = await getUserRootSelections(userId, appId);
    else results = await getUserSelections(userId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
