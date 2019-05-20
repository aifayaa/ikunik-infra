import getSelectionSubscriptions from '../libs/getSelectionSubscriptions';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const selectionId = event.pathParameters.id;
  try {
    const results = await getSelectionSubscriptions(selectionId, userId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
