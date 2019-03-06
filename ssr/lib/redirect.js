import url from 'url';

export default (userAgent, redirectUrl) => {
  if (!(userAgent.indexOf('facebookexternalhit/1.1') + 1) && redirectUrl) {
    const decodedUrl = decodeURIComponent(redirectUrl);
    const {
      hostname,
      protocol,
    } = url.parse(decodedUrl);
    const isValid =
      (hostname.endsWith('crowdaa.com') && protocol === 'https:');
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
