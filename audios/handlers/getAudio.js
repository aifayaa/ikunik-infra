import getAudio from '../lib/getAudio';

export default async (event, context, callback) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const audioId = event.pathParameters.id;
    const results = await getAudio(audioId, appId);
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
