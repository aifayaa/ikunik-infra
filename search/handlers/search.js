import search from '../lib/search';

export const handleSearch = async (event, context, callback) => {
  try {
    const { text } = event.queryStringParameters || {};
    const results = await search(text);
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
      body: JSON.stringify(e.message),
    };
    callback(null, response);
  }
};
