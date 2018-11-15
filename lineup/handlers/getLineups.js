import getLineups from '../lib/getLineups';

export default async (event, context, callback) => {
  const response = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
  try {
    const results = await getLineups();
    if (results) {
      response.statusCode = 200;
      response.body = JSON.stringify(results);
    } else {
      response.statusCode = 404;
      response.body = JSON.stringify({ message: 'lineups_not_found' });
    }
  } catch (e) {
    response.statusCode = 500;
    response.body = JSON.stringify({ message: e.message });
  } finally {
    callback(null, response);
  }
};
