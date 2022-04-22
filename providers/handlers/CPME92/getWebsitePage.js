import getWebsitePage from '../../lib/CPME92/getWebsitePage';

export default async (event) => {
  try {
    const {
      path: pagePath,
    } = event.queryStringParameters || {};

    const page = await getWebsitePage(
      pagePath,
    );

    return ({
      statusCode: 200,
      body: page,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('Error :', e);
    return ({
      statusCode: 500,
      body: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
  <head>
  <body style="padding: 30px; text-align: center;">
    Internal server error, please retry later.
  </body>
</html>`,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
};
