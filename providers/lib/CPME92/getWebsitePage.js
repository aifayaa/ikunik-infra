/* eslint-disable import/no-relative-packages */
import request from 'request-promise-native';

const { CPME92_URL } = process.env;

const allowedPaths = ['/evenements'];

export default async (pagePath) => {
  if (allowedPaths.indexOf(pagePath) < 0) throw new Error('invalid_path');

  const response = await request({
    method: 'GET',
    uri: `${CPME92_URL}${pagePath}`,
    encoding: 'utf8',
    headers: {
      'Cache-Control': 'no-cache',
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0',
      Pragma: 'no-cache',
    },
  });

  return response
    .replace(
      /<\/head>/g,
      `<style>
header.Header.Header--top,
div.Mobile-bar.Mobile-bar--top,
div.Mobile-bar.Mobile-bar--bottom,
.sqs-announcement-bar-dropzone,
div.Header-search,
footer.Footer,
div.sqs-cookie-banner-v2 {
  display: none !important;
}

div.Content-outer {
  padding-top: 30px;
}
</style>
</head>`
    )
    .replace(/<a( [^>]*)? href="https?:\/\/"/g, '<a$1 href="#"')
    .replace(/<a( [^>]*)? href="(\/[^"]*)"/g, '<a$1 href="#"')
    .replace(/<a( [^>]*)? href='(\/[^']*)'/g, "<a$1 href='#'")
    .replace(
      /<img( [^>]*)? src=(["'])\/([^/])/g,
      `<img$1 src=$2${CPME92_URL}/$3`
    )
    .replace(
      /<link( [^>]*)? href=(["'])\/([^/])/g,
      `<link$1 href=$2${CPME92_URL}/$3`
    )
    .replace(
      /<script( [^>]*)? src=(["'])\/([^/])/g,
      `<script$1 src=$2${CPME92_URL}/$3`
    );
};
