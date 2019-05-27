import url from 'url';
import isCrawler from './isCrawler';

const allowedCustomProtocols = [
  'crowdaapress:',
  'lequotidien:',
  'crowdaa:',
];

export default (userAgent, redirectUrl) => {
  if (!isCrawler(userAgent) && redirectUrl) {
    const decodedUrl = decodeURIComponent(redirectUrl);
    const {
      hostname,
      protocol,
    } = url.parse(decodedUrl);
    const isValid =
      (hostname.endsWith('crowdaa.com') && protocol === 'https:') ||
      allowedCustomProtocols.includes(protocol);
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
