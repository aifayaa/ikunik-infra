import doRegisterDevice from '../lib/registerDevice';

export default async (event, context, callback) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const userId = event.requestContext.authorizer.principalId;
    const { Token, deviceUUID, platform } = JSON.parse(event.body);

    const results = await doRegisterDevice({ userId, Token, deviceUUID, platform });

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
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
