/* eslint-disable import/no-relative-packages */
import sendPinCode from '../lib/sendPinCode';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    return response({ code: 403, message: 'Forbidden' });
  }
  if (!event.body) {
    throw new Error('mal formed request');
  }
  try {
    const { phoneNumber } = JSON.parse(event.body);
    if (!phoneNumber) {
      throw new Error('mal formed request');
    }
    await sendPinCode(phoneNumber, appId);
    return response({ code: 200, body: true });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
