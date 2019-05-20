import winston from 'winston';
import buyTickets from '../lib/buyTickets';
import sendTicket from '../lib/sendTicket';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  try {
    if (!event.body) {
      throw new Error('mal formed request');
    }
    const { categoryId, lastName, firstName, email } = JSON.parse(event.body);
    if (!categoryId || !email) {
      throw new Error('mal formed request');
    }
    const ticketMail = await buyTickets(userId, appId, categoryId, lastName, firstName, email);
    // special try to not send 500 even if ticket not send
    try {
      await sendTicket(ticketMail, appId);
    } catch (error) {
      winston.warn('Failed to send ticket', error);
    }
    callback(null, response({ code: 200, body: true }));
  } catch (e) {
    if (e.message === 'ticket_formatting_failed') {
      callback(null, response({ code: 200, body: true }));
    } else {
      callback(null, response({ code: 500, message: e.message }));
    }
  }
};
