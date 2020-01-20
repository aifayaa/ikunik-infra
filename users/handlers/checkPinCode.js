import checkPinCode from '../lib/checkPinCode';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    return response({ code: 403, message: 'Forbidden' });
  }

  try {
    if (!event.body) {
      throw new Error('mal formed request');
    }
    const { phoneNumber, pinCode, deviceUuid } = JSON.parse(event.body);
    if (!phoneNumber || !pinCode) {
      throw new Error('mal formed request');
    }
    await checkPinCode(phoneNumber, pinCode, (deviceUuid || null), userId, appId);
    return response({ code: 200, body: true });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
