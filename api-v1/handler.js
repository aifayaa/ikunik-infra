/* eslint-disable import/no-relative-packages */
export const handleGetV1 = () =>
  new Promise((resolve) => {
    resolve({
      statusCode: 200,
      body: 'API v1 OK',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    });
  });
