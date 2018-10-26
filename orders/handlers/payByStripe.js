import payByStripe from '../lib/payByStripe';

export default async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  };
  let response;
  if (!event.body) {
    throw new Error('mal_formed_request');
  }

  try {
    const { token, packageId } = JSON.parse(event.body);
    if (!token || !packageId) {
      throw new Error('mal_formed_request');
    }
    const res = await payByStripe(token, packageId, userId);
    response = {
      statusCode: 200,
      body: JSON.stringify(res),
      headers,
    };
  } catch (e) {
    response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
      headers,
    };
  } finally {
    callback(null, response);
  }
};
