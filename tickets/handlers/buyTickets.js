import buyTickets from '../lib/buyTickets';

export const handleBuyTickets = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    if (!event.body) {
      throw new Error('mal formed request');
    }
    const { categoryId, lastName, firstName, email } = JSON.parse(event.body);
    if (!categoryId || !email) {
      throw new Error('mal formed request');
    }
    const results = await buyTickets(userId, categoryId, lastName, firstName, email);
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
