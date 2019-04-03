import search from '../lib/search';

export const handleSearch = async (event, context, callback) => {
  try {
    const { text, skip, limit } = event.queryStringParameters || {};
    const results = await search(
      text,
      {
        skip: parseInt(skip, 10) || undefined,
        limit: parseInt(limit, 10) || undefined,
      },
    );
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
