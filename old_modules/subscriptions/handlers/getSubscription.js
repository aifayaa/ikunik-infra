import getSubscription from '../lib/getSubscription';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const subId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await getSubscription(subId, appId);
    if (results) return response({ code: 200, body: results });
    return response({ code: 404, message: 'subscription_not_found' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
