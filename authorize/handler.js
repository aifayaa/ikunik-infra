export const handleGetAuthorize = async (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({ message: 'ok' }),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
  callback(null, response);
};
