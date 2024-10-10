/* eslint-disable import/no-relative-packages */
import getAppsInfos from '../../apps/lib/getAppsInfos';
import isCrawler from './isCrawler';
import allowedUrls from './urlWhiteList';

const { APPS_WEBSITE_URL } = process.env;

export default async (userAgent, redirectUrl, appId) => {
  if (!isCrawler(userAgent) && redirectUrl) {
    let decodedUrl = decodeURIComponent(redirectUrl);
    /* remove accent in Url */
    decodedUrl = decodedUrl.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    /* /!\ url parser adds ":" at the end of the protocol */
    const { host, hostname, path } = new URL(decodedUrl);
    /* URL parsing makes a toLowerCase, however some old (Before 2024/10/10) protocols
     * have capital letters. We cannot mass-update it easily, so we need to handle it here... */
    const [rawProtocol] = decodedUrl.split(':', 1);

    const appsInfos = await getAppsInfos(true);
    const allowedProtocols = appsInfos.map((v) => `${v.protocol}`);

    /* Check if redirect is valid */
    const isValid =
      (hostname.endsWith('crowdaa.com') && rawProtocol === 'https:') ||
      allowedUrls.includes(`${rawProtocol}//${host}${path}`) ||
      allowedProtocols.includes(rawProtocol);

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
