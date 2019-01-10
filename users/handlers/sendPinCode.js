import sendPinCode from '../lib/sendPinCode';

export default async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    const response = {
      statusCode: 403,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
    callback(null, response);
    return;
  }

  const response = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
  try {
    if (!event.body) {
      throw new Error('mal formed request');
    }
    const { phoneNumber } = JSON.parse(event.body);
    if (!phoneNumber) {
      throw new Error('mal formed request');
    }
    await sendPinCode(phoneNumber);
    response.statusCode = 200;
    response.body = JSON.stringify(true);
  } catch (e) {
    response.statusCode = 500;
    response.body = JSON.stringify({ message: e.message });
  } finally {
    callback(null, response);
  }
};
