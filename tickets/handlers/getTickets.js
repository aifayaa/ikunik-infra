import getTickets from '../lib/getTickets';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const urlId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  try {
    if (userId !== urlId) {
      callback(null, response({ code: 403, message: 'forbidden' }));
      return;
    }
    const results = await getTickets(userId, appId);
    if (results) {
      callback(null, response({ code: 200, body: results }));
    } else {
      callback(null, response({ code: 404, message: 'ticket_not_found' }));
    }
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
