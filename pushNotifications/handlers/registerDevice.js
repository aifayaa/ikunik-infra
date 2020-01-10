import registerDevice from '../lib/registerDevice';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { appId } = event.requestContext.authorizer;
    const userId = event.requestContext.authorizer.principalId;
    const { Token, deviceUUID, platform } = JSON.parse(event.body);

    await registerDevice({
      userId,
      Token,
      deviceUUID,
      platform,
      appId,
    });

    return response({ code: 200, body: { registered: true } });
  } catch (e) {
    const code = (e.message === 'already_registered_token') ? 200 : 500;
    return response({ code, message: e.message });
  }
};
