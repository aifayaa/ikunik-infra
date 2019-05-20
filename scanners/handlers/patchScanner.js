import patchScanner from '../lib/patchScanner';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  try {
    const { appId, profileId } = event.requestContext.authorizer;
    const userId = event.requestContext.authorizer.principalId;
    const scannerId = event.pathParameters.id;

    const results = await patchScanner(userId, profileId, scannerId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
