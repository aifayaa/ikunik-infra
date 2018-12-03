import getTicketCategoriesByLineup from '../lib/getTicketCategoriesByLineup';

export const handleGetTicketCategoriesByLineup = async (event, context, callback) => {
  let { lineupId } = event.pathParameters;
  const { id } = event.pathParameters;
  let userId = id;
  if (event.resource.split('/')[1] === 'users') {
    userId = event.requestContext.authorizer.principalId;
  } else {
    userId = null;
    lineupId = id;
  }
  try {
    if (userId && userId !== id) throw new Error('forbidden');
    const results = await getTicketCategoriesByLineup(lineupId, userId);
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: e.message }),
    };

    switch (e.message) {
      case 'forbidden':
      case 'ressource_not_owned':
        response.statusCode = 403;
        break;
      default:
        response.statusCode = 500;
    }

    callback(null, response);
  }
};
