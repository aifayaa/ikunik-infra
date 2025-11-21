/* eslint-disable import/no-relative-packages */
import isCrawler from './isCrawler';
import allowedUrls from './urlWhiteList';

const { APPS_WEBSITE_URL } = process.env;

export default (userAgent, redirectUrl, appId, appProtocol, webAppUrl) => {
  if (!isCrawler(userAgent) && redirectUrl) {
    let decodedUrl = decodeURIComponent(redirectUrl);
    /* remove accent in Url */
    decodedUrl = decodedUrl.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    /* /!\ url parser adds ":" at the end of the protocol */
    const decodeUrlData = new URL(decodedUrl);
    const { host, hostname, path } = decodeUrlData;
    /* URL parsing makes a toLowerCase, however some old (Before 2024/10/10) protocols
     * have capital letters. We cannot mass-update it easily, so we need to handle it here... */
    const [rawProtocol] = decodedUrl.split(':', 1);

    /* Check if redirect is valid */
    const isValid =
      (hostname.endsWith('crowdaa.com') && rawProtocol === 'https:') ||
      allowedUrls.includes(`${rawProtocol}//${host}${path}`) ||
      appProtocol === rawProtocol;

    if (isValid) {
      const locationRedirectUrl = new URL(`https://${APPS_WEBSITE_URL}`);

      locationRedirectUrl.searchParams.set('app_id', appId);
      locationRedirectUrl.searchParams.set('mobile_redirect', decodedUrl);

      if (webAppUrl) {
        webAppUrl = new URL(webAppUrl);
        webAppUrl.path = path;
        locationRedirectUrl.searchParams.set(
          'web_app_redirect_url',
          webAppUrl.toString()
        );
      }

      return {
        statusCode: 301,
        headers: {
          Location: locationRedirectUrl.toString(),
        },
      };
    }
    throw new Error('bad_redirect');
  }
  return null;
};
