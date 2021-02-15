import get from 'lodash/get';
import response from '../../libs/httpResponses/response';
import getAppFromName from '../lib/getAppFromName';
import { getArticle } from '../../pressArticles/lib/getArticle';
import meta from '../lib/meta';
import prepareNotifString from '../../pressArticles/lib/prepareNotifString';
import redirect from '../lib/redirect';

export default async (event) => {
  try {
    const redirectUrl = (event.queryStringParameters || {}).redirect_url;
    const { appName } = (event.queryStringParameters || {});
    const userAgent = event.headers['User-Agent'];
    const {
      _id: appId,
      builds,
      credentials,
    } = await getAppFromName(appName);
    const redirectResponse = await redirect(userAgent, redirectUrl, appId);
    if (redirectResponse) {
      return redirectResponse;
    }
    const articleId = event.pathParameters.id;
    const article = await getArticle(articleId, appId, { getPictures: true, isServer: true });
    if (!article) {
      throw new Error('article_not_found');
    }
    const picture = article.pictures[0] || {};
    const video = article.videos[0] || {};
    const previewUrl = (picture && picture.mediumUrl) || (video && video.thumbUrl) || '';
    const options = {
      height: picture.mediumHeight,
      width: picture.mediumWidth,
      url: redirectUrl,
      androidAppName: get(builds, 'android.name'),
      androidPackageId: get(builds, 'android.packageId'),
      iosAppName: get(builds, 'ios.name'),
      iosAppStoreId: get(builds, 'ios.iosAppId'),
      fbAppId: get(credentials, 'facebook.appId'),
    };
    const body = meta(
      article.title,
      prepareNotifString(article.plainText, 120),
      previewUrl,
      options,
    );
    return response({ code: 200, body, raw: true });
  } catch (e) {
    let code;
    switch (e.message) {
      case 'article_not_found':
        code = 404;
        break;
      default:
        code = 500;
    }
    return response({ code, message: e.message });
  }
};
