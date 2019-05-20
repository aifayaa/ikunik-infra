import deleteContact from '../lib/deleteContact';
import response from '../../libs/httpResponses/response';

export default async (event, _context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId, profileId } = event.requestContext.authorizer;
    const contactId = event.pathParameters.id;
    const results = await deleteContact(userId, profileId, contactId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
