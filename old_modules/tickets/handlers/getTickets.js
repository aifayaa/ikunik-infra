import getTickets from '../lib/getTickets';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const urlId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  try {
    if (userId !== urlId) {
      return response({ code: 403, message: 'forbidden' });
    }
    const results = await getTickets(userId, appId);
    if (results) {
      return response({ code: 200, body: results });
    }
    return response({ code: 404, message: 'ticket_not_found' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
