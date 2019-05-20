import patchSubscription from '../lib/patchSubscription';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  const subId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  try {
    const patch = JSON.parse(event.body);
    const subscriptions = await patchSubscription(userId, subId, appId, patch);
    callback(null, response({ code: 200, body: { subscriptions } }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
