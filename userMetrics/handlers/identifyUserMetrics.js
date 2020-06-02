import identifyUserMetrics from '../lib/identifyUserMetrics';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const {
    appId,
    principalId: userId,
  } = event.requestContext.authorizer;

  const {
    id: deviceId,
  } = event.pathParameters;

  try {
    if (!deviceId) {
      throw new Error('missing_arguments');
    }

    if (typeof deviceId !== 'string') {
      throw new Error('wrong_argument_type');
    }

    // @TODO: security aspect not handled here
    // If someone forge a request to claim devices id's
    // We should make sure a deviceId is free to be claimed
    //  without forbidding users to share a device

    const results = await identifyUserMetrics(
      appId,
      userId,
      deviceId,
    );

    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
