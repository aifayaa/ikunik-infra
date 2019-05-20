import getPicture from '../lib/getPicture';

export default async (event, _context, callback) => {
  try {
    const { id } = event.pathParameters;
    const { appId } = event.requestContext.authorizer;
    const { waitCreation } = event.queryStringParameters || {};
    const results = await getPicture(id, appId, { waitCreation });
    if (!results) throw new Error('picture_not_found');
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
      statusCode: e.message === 'picture_not_found' ? 404 : 500,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
