import resendTicket from '../lib/resendTicket';

export const handleResendTicket = async (event, context, callback) => {
  try {
    const ticketId = event.pathParameters.id;
    const results = await resendTicket(ticketId);
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};
