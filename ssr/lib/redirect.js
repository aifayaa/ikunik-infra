import url from 'url';
import isCrawler from './isCrawler';
import allowedProtocols from './protocolWhiteList';
import allowedUrls from './urlWhiteList';

export default (userAgent, redirectUrl) => {
  if (!isCrawler(userAgent) && redirectUrl) {
    const decodedUrl = decodeURIComponent(redirectUrl);
    const {
      host,
      hostname,
      path,
      protocol,
    } = url.parse(decodedUrl);
    const isValid = (hostname.endsWith('crowdaa.com') && protocol === 'https:')
      || allowedUrls.includes(`${protocol}//${host}${path}`)
      || allowedProtocols.includes(protocol);
    if (isValid) {
      return {
        statusCode: 301,
        headers: {
          Location: decodedUrl,
        },
      };
    }
    throw new Error('bad_redirect');
  }
  return null;
};
