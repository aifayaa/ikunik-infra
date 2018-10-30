import createArtist from '../lib/createArtist';

export default async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const pathUserId = event.pathParameters.id;
    if (pathUserId !== userId) {
      throw new Error('Unauthorized');
    }
    const {
      name,
      biography,
      facebook,
      instagram,
      twitter,
      snapchat,
    } = JSON.parse(event.body);

    if (!name) {
      throw new Error('Missing arguments');
    }
    [
      name,
      biography,
      facebook,
      instagram,
      twitter,
      snapchat,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('Wrong argument type');
      }
    });

    const results = await createArtist(userId, {
      name,
      biography,
      facebook,
      instagram,
      twitter,
      snapchat,
    });
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
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    switch (e.message) {
      case 'Unauthorized':
        response.statusCode = 403;
        break;
      default:
        response.statusCode = 500;
        break;
    }
    callback(null, response);
  }
};
