import buyTickets from '../lib/buyTickets';
import sendTicket from '../lib/sendTicket';

export const handleBuyTickets = async (event, context, callback) => {
  const response = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
  try {
    const userId = event.requestContext.authorizer.principalId;
    if (!event.body) {
      throw new Error('mal formed request');
    }
    const { categoryId, lastName, firstName, email } = JSON.parse(event.body);
    if (!categoryId || !email) {
      throw new Error('mal formed request');
    }
    const ticketMail = await buyTickets(userId, categoryId, lastName, firstName, email);
    // special try to not send 500 even if ticket not send
    try {
      await sendTicket(ticketMail);
    } catch (error) {
      console.warn('Failed to send ticket', error);
    }
    response.statusCode = 200;
    response.body = JSON.stringify(true);
  } catch (e) {
    if (e.message === 'ticket_formatting_failed') {
      response.statusCode = 200;
      response.body = JSON.stringify(true);
    } else {
      response.statusCode = 500;
      response.body = JSON.stringify({ message: e.message });
    }
  } finally {
    callback(null, response);
  }
};
