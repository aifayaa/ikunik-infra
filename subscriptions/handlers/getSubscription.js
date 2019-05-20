import getSubscription from '../lib/getSubscription';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  const subId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await getSubscription(subId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
