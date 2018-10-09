import scanTicket from '../lib/scanTicket';

export const handleScanTicket = async (event, context, callback) => {
  try {
    const ticketId = event.pathParameters.id;
    const { scannerId } = JSON.parse(event.body);

    if (!ticketId || !scannerId) {
      const response = {
        statusCode: 400,
        body: JSON.stringify({ message: 'mal formed request' }),
      };
      callback(null, response);
    }
    const results = await scanTicket(ticketId, scannerId);
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

    switch (e.message) {
      case 'ticket_category_not_exists':
      case 'ticket_not_found':
        response.statusCode = 404;
        break;
      case 'ticket_already_scanned':
        response.statusCode = 403;
        break;
      case 'invalid_scanner':
      case 'scanner_unauthorized':
        response.statusCode = 403;
        break;
      default:
    }
    callback(null, response);
  }
};
