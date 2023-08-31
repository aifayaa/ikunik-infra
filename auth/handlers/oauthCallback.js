import response from '../../libs/httpResponses/response';
import oauthCallback from '../lib/oauthCallback';

export default async (event) => {
  try {
    const appId = event.pathParameters.id;
    const urlArgs = event.queryStringParameters || {};

    const retVal = await oauthCallback(appId, urlArgs);

    if (typeof retVal === 'string') {
      return response({
        code: 302,
        headers: {
          Location: retVal,
        },
        body: '',
      });
    }

    return response({ code: 200, body: retVal });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('ERROR', e);

    return response({
      code: 200,
      body: `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
  <head>
  <body style="padding: 30px; text-align: center;">
    Error : ${e}
  </body>
  </html>`,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
};
