import createScanners from '../lib/createScanners';

export default async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const lineupId = event.pathParameters.id;
    if (!event.body) {
      throw new Error('mal formed request');
    }
    const { email } = JSON.parse(event.body);
    if (!lineupId || !email) {
      throw new Error('mal formed request');
    }
    const results = await createScanners(userId, lineupId, email);
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};
