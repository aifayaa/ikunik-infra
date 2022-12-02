import patchSubscription from '../lib/patchSubscription';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const subId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  try {
    const patch = JSON.parse(event.body);
    const subscriptions = await patchSubscription(userId, subId, appId, patch);
    return response({ code: 200, body: { subscriptions } });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
