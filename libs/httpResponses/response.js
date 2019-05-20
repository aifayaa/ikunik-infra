export default ({ code, body, message }) => ({
  statusCode: code || 500,
  body: (body && (typeof body === 'string' ? body : JSON.stringify(body))) ||
    (message && JSON.stringify({ message })) || '{}',
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
});
