import resendTicket from '../lib/resendTicket';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const ticketId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await resendTicket(ticketId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
