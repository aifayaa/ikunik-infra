export default ({ headers = {}, code, body, message, raw }) => {
  if (!body && !message) {
    message = 'http_error_missing_response_arguments';
  }
  let respBody;

  if (body) {
    if (raw) {
      respBody = body;
    } else {
      respBody = (typeof body === 'string') ? { message: body } : body;
      respBody = JSON.stringify(respBody);
    }
  } else {
    respBody = JSON.stringify({ message });
  }

  return {
    statusCode: code || 500,
    body: respBody,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      ...headers,
    },
  };
};
