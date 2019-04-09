import buildResponse from '../../libs/httpResponses/response';
import doRegisterDevice from '../lib/registerDevice';
import getClient from '../../api-keys/getClient';

export default async (event, context, callback) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const client = getClient(event.requestContext.identity.apiKey);
    const userId = event.requestContext.authorizer.principalId;
    const { Token, deviceUUID, platform } = JSON.parse(event.body);

    await doRegisterDevice({
      userId,
      Token,
      deviceUUID,
      platform,
      clients: [client],
    });

    callback(null, buildResponse({ code: 200, body: { registerd: true } }));
  } catch (e) {
    let response;
    switch (e.message) {
      case 'already_registered_token':
        response = buildResponse({ code: 200, message: e.message });
        break;
      default:
        response = buildResponse({ code: 500, message: e.message });
    }
    callback(null, response);
  }
};
