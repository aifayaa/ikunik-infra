import url from 'url';
import getAppsInfos from '../../apps/lib/getAppsInfos';
import isCrawler from './isCrawler';
import allowedUrls from './urlWhiteList';

const { APPS_WEBSITE_URL } = process.env;

export default async (userAgent, redirectUrl, appId) => {
  if (!isCrawler(userAgent) && redirectUrl) {
    const decodedUrl = decodeURIComponent(redirectUrl);
    /* /!\ url.parse adds ":" at the end of the protocol */
    const {
      host,
      hostname,
      path,
      protocol,
    } = url.parse(decodedUrl);

    /* Retrieve list of allowed protocols from database
     * and add ":" after protocol to match with url.parse */
    const appsInfos = await getAppsInfos(true);
    const allowedProtocols = appsInfos.map((v) => `${v.protocol}:`);

    /* Check if redirect is valid */
    const isValid = (hostname.endsWith('crowdaa.com') && protocol === 'https:')
      || allowedUrls.includes(`${protocol}//${host}${path}`)
      || allowedProtocols.includes(protocol);

    if (isValid) {
      return {
        statusCode: 301,
        headers: {
          Location: `https://${APPS_WEBSITE_URL}?app_id=${appId}&mobile_redirect=${decodedUrl}`,
        },
      };
    }
    throw new Error('bad_redirect');
  }
  return null;
};
