import createIndex from '../lib/createIndex';

export const handleCreateIndex = async (...callback) => {
  try {
    const results = await createIndex();
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
