import requestLib from 'request-promise-native';

const {
  CPME_PATH_AUTH,
  CPME_URL,
  CPME_CRED_PASS,
  CPME_CRED_USER,
} = process.env;

const allowedPaths = [
  '/annuaire/institutions',
  '/annuaire/adherents',
];

export default async (
  pagePath,
) => {
  if (allowedPaths.indexOf(pagePath) < 0) throw new Error('invalid_path');

  const cookiesJar = requestLib.jar();
  cookiesJar.setCookie(requestLib.cookie('utilisation_cookies=close'), CPME_URL);

  const request = requestLib.defaults({ jar: cookiesJar });

  await request({
    method: 'GET',
    uri: `${CPME_URL}/`,
  });

  const returnPathBase64 = Buffer.from(pagePath).toString('base64');
  const authPath = CPME_PATH_AUTH.replace('RETURN_PATH_BASE64', returnPathBase64);
  const uri = `${CPME_URL}${authPath}`;
  await request({
    method: 'POST',
    uri,
    form: {
      identifant: CPME_CRED_USER,
      passwd: CPME_CRED_PASS,
    },
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0',
      Origin: CPME_URL,
      Pragma: 'no-cache',
      Referer: uri,
    },
  });

  const response = await request({
    method: 'GET',
    uri: `${CPME_URL}${pagePath}`,
    encoding: 'latin1',
    headers: {
      'Cache-Control': 'no-cache',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0',
      Pragma: 'no-cache',
    },
  });

  return (response
    .replace(/<head>/g, `<head>
<style>
form,
div.span4,
header.header_block,
div#slider,
div#content_bottom,
footer,
nav#menu,
breadcrumb,
div#content_top {
  display: none !important;
}

body {
  transition: none !important;
}

div.container {
  margin: 0 !important;
  padding: 10px 20px !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

div.span8 {
  width: 100% !important;
  box-sizing: border-box !important;
}
</style>`)
    .replace(/<meta charset="ISO-8859-1">/gi, '<meta charset="utf-8">')
    .replace(/<a( [^>]*)? href="(\/[^"]*)"/g, '<a$1 href="#"')
    .replace(/<a( [^>]*)? href='(\/[^']*)'/g, '<a$1 href=\'#\'')
    .replace(/<img( [^>]*)? src=(["'])\/([^/])/g, `<img$1 src=$2${CPME_URL}/$3`)
    .replace(/<link( [^>]*)? href=(["'])\/([^/])/g, `<link$1 href=$2${CPME_URL}/$3`)
    .replace(/<script( [^>]*)? src=(["'])\/([^/])/g, `<script$1 src=$2${CPME_URL}/$3`)
  );
};
