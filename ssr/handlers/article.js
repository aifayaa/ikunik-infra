import buildResponse from '../../libs/httpResponses/response';
import getAppId from '../lib/getAppId';
import { getArticle } from '../../pressArticles/lib/getArticle';
import meta from '../lib/meta';
import prepareNotifString from '../../pressArticles/lib/prepareNotifString';
import redirect from '../lib/redirect';

export default async (event) => {
  try {
    const redirectUrl = (event.queryStringParameters || {}).redirect_url;
    const { appName } = (event.queryStringParameters || {});
    const userAgent = event.headers['User-Agent'];
    const redirectResponse = redirect(userAgent, redirectUrl);
    if (redirectResponse) {
      return redirectResponse;
    }
    const appId = await getAppId(appName);
    const articleId = event.pathParameters.id;
    const article = await getArticle(articleId, appId, { getPictures: true, isServer: true });
    if (!article) throw new Error('article_not_found');
    const pictureUrl = (article.pictures[0] && article.pictures[0].mediumUrl) || '';
    const body = meta(
      article.title,
      prepareNotifString(article.plainText, 120),
      pictureUrl,
    );
    return buildResponse({ code: 200, body, raw: true });
  } catch (e) {
    let code;
    switch (e.message) {
      case 'article_not_found':
        code = 404;
        break;
      default:
        code = 500;
    }
    return buildResponse({ code, message: e.message });
  }
};
