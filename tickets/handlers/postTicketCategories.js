import postTicketCategoriesByLineup from '../lib/postTicketCategoriesByLineup';

export default async (event, context, callback) => {
  const lineupId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;

  if (!event.body) {
    throw new Error('mal formed request');
  }

  const { price, qty, startSale, endSale, name } = JSON.parse(event.body);
  if (!price || !qty || !startSale || !endSale || !name) {
    throw new Error('mal formed request');
  }

  try {
    const results = await postTicketCategoriesByLineup(
      lineupId,
      price,
      qty,
      startSale,
      endSale,
      name,
      userId,
    );
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
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
