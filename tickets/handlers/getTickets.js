import getTickets from '../lib/getTickets';

export default async (event, context, callback) => {
  const response = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
  try {
    const userId = event.requestContext.authorizer.principalId;
    const urlId = event.pathParameters.id;
    if (userId !== urlId) {
      response.statusCode = 403;
      response.body = JSON.stringify({ message: 'forbidden' });
      return;
    }
    const results = await getTickets(userId);
    if (results) {
      response.statusCode = 200;
      response.body = JSON.stringify({ tickets: results });
    } else {
      response.statusCode = 404;
      response.body = JSON.stringify({ message: 'ticket_not_found' });
    }
  } catch (e) {
    response.statusCode = 500;
    response.body = JSON.stringify({ message: e.message });
  } finally {
    callback(null, response);
  }
};
