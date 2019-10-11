export default ({ code, body, message }) => {
  if (!body && !message) throw new Error('missing_arguments');
  let respBody;
  if (body) {
    respBody = typeof body === 'string' ? { message: body } : body;
  } else {
    respBody = { message };
  }
  return {
    statusCode: code || 500,
    body: JSON.stringify(respBody),
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
};
