import buildResponse from '../../libs/httpResponses/response';
import getAppId from '../lib/getAppId';
import getArticle from '../../pressArticles/lib/getArticle';
import meta from '../lib/meta';
import prepareNotifString from '../../pressArticles/lib/prepareNotifString';
import redirect from '../lib/redirect';

export default async (event, context, callback) => {
  try {
    const redirectUrl = (event.queryStringParameters || {}).redirect_url;
    const { appName } = (event.queryStringParameters || {});
    const userAgent = event.headers['User-Agent'];
    const redirectResponse = redirect(userAgent, redirectUrl);
    if (redirectResponse) {
      callback(null, redirectResponse);
      return;
    }
    const appId = await getAppId(appName);
    const articleId = event.pathParameters.id;
    const article = await getArticle(articleId, appId, { getPictures: true, isServer: true });
    const body = meta(
      article.title,
      prepareNotifString(article.plainText, 120),
      article.pictures[0].mediumUrl,
    );
    callback(null, buildResponse({ code: 200, body }));
  } catch (e) {
    callback(null, buildResponse({ code: 500, message: e.message }));
  }
};
