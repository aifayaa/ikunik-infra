/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import samlACSCallback from '../lib/samlACSCallback';

export default async (event) => {
  try {
    const { body } = event;
    const parsedBody = new URLSearchParams(body);
    const xmlBuffer = Buffer.from(parsedBody.get('SAMLResponse'), 'base64');
    const xmlData = xmlBuffer.toString('utf8');

    const retVal = await samlACSCallback(xmlData);

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
    return response({
      code: 500,
      body: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
  <head>
  <body style="padding: 30px; text-align: center;">
    Server error : ${e.message}
  </body>
</html>`,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
};
