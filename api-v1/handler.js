export const handleGetV1 = () => ({
  statusCode: 200,
  body: 'API V1 OK',
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
});
