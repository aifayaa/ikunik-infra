import getPackages from '../lib/getPackages';

export default async (event, _context, callback) => {
  const { appId } = event.requestContext.authorizer;

  const response = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
  try {
    const results = await getPackages(appId);
    if (results) {
      response.statusCode = 200;
      response.body = JSON.stringify(results);
    } else {
      response.statusCode = 404;
      response.body = JSON.stringify({ message: 'packages_not_found' });
    }
  } catch (e) {
    response.statusCode = 500;
    response.body = JSON.stringify({ message: e.message });
  } finally {
    callback(null, response);
  }
};
