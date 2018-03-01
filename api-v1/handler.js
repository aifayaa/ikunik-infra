export const handleGetV1 = async (event, context, callback) => {
  try {
    const response = {
      statusCode: 200,
      body: 'API V1 OK',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      message: e.message,
    };
    callback(null, response);
  }
};
