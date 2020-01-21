import response from '../../libs/httpResponses/response';
import subscribe from '../lib/subscribe';

export default async (event) => {
  const subId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await subscribe(userId, subId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
