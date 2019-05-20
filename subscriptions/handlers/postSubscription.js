import response from '../../libs/httpResponses/response';
import subscribe from '../lib/subscribe';

export default async (event, _context, callback) => {
  const subId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await subscribe(userId, subId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
