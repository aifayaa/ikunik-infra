import getTicketCategoriesByLineup from '../lib/getTicketCategoriesByLineup';

export const handleGetTicketCategoriesByLineup = async (event, context, callback) => {
  const lineupId = event.pathParameters.id;
  try {
    const results = await getTicketCategoriesByLineup(lineupId);
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
