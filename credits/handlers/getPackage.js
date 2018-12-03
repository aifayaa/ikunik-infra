import getPackage from '../lib/getPackage';

export default async (event, context, callback) => {
  const { id } = event.pathParameters;
  const response = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
  try {
    const results = await getPackage(id);
    if (results) {
      response.statusCode = 200;
      response.body = JSON.stringify(results);
    } else {
      response.statusCode = 404;
      response.body = JSON.stringify({ message: 'package_not_found' });
    }
  } catch (e) {
    response.statusCode = 500;
    response.body = JSON.stringify({ message: e.message });
  } finally {
    callback(null, response);
  }
};
