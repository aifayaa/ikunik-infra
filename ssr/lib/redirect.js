import url from 'url';
import getAppsInfos from '../../apps/lib/getAppsInfos';
import isCrawler from './isCrawler';
import allowedUrls from './urlWhiteList';

export default async (userAgent, redirectUrl) => {
  if (!isCrawler(userAgent) && redirectUrl) {
    const decodedUrl = decodeURIComponent(redirectUrl);
    const {
      host,
      hostname,
      path,
      protocol,
    } = url.parse(decodedUrl);

    /* Retrieve list of allowed protocols from database */
    const appsInfos = await getAppsInfos();
    const allowedProtocols = appsInfos.map((v) => v.protocol);

    /* Check if redirect was valid */
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
