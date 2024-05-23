/* eslint-disable import/no-relative-packages */
import get from 'lodash/get';
import response from '../../libs/httpResponses/response.ts';
import getAppFromName from '../lib/getAppFromName';
import getUserGeneratedContents from '../../userGeneratedContents/lib/getUserGeneratedContents';
import meta from '../lib/meta';
import prepareNotifString from '../../pressArticles/lib/prepareNotifString';
import redirect from '../lib/redirect';

export default async (event) => {
  try {
    const redirectUrl = (event.queryStringParameters || {}).redirect_url;
    const { appName } = event.queryStringParameters || {};
    const userAgent = event.headers['User-Agent'];
    const { _id: appId, builds, credentials } = await getAppFromName(appName);
    const redirectResponse = await redirect(userAgent, redirectUrl, appId);
    if (redirectResponse) {
      return redirectResponse;
    }
    const articleId = event.pathParameters.id;
    const articleResults = await getUserGeneratedContents(appId, articleId);
    if (!articleResults || !articleResults.length) {
      throw new Error('article_not_found');
    }
    const article = articleResults[0];
    const picture = article.data.pictures[0] || {};
    const pictureUrl = (picture && picture.mediumUrl) || '';
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
      article.data.title,
      prepareNotifString(article.data.content, 120),
      pictureUrl,
      options
    );
    return response({
      code: 200,
      body,
      raw: true,
      headers: { 'Content-Type': 'text/html' },
    });
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
