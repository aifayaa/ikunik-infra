import scanTicket from '../lib/scanTicket';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  try {
    const serial = event.pathParameters.id;
    const { appId } = event.requestContext.authorizer;
    const { scannerId } = JSON.parse(event.body);

    if (!serial || !scannerId) {
      callback(null, response({ code: 400, message: 'malformed request' }));
    }
    const results = await scanTicket(serial, scannerId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    let code = 500;

    switch (e.message) {
      case 'ticket_category_not_exists':
      case 'ticket_not_found':
        code = 404;
        break;
      case 'ticket_already_scanned':
      case 'invalid_scanner':
      case 'scanner_unauthorized':
        code = 403;
        break;
      default:
    }
    callback(null, response({ code, message: e.message }));
  }
};
