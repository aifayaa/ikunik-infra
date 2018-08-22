import isMediaLocked from '../lib/isMediaLocked';

export const handleIsMediaLocked = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const mediumId = event.pathParameters.id;
    const result = await isMediaLocked(userId, mediumId);
    const response = {
      statusCode: result ? 200 : 403,
      body: JSON.stringify({ message: result ? 'ok' : 'Forbidden' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify(e.message),
    };
    callback(null, response);
  }
};
