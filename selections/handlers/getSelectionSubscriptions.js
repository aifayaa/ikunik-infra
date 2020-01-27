import getSelectionSubscriptions from '../libs/getSelectionSubscriptions';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const selectionId = event.pathParameters.id;
  try {
    const results = await getSelectionSubscriptions(selectionId, userId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
