import buildResponse from '../../libs/httpResponses/response';
import getArticle from '../../pressArticles/lib/getArticle';
import prepareNotifString from '../../pressArticles/lib/prepareNotifString';
import meta from '../lib/meta';
import redirect from '../lib/redirect';

export default async (event, context, callback) => {
  try {
    const redirectUrl = (event.queryStringParameters || {}).redirect_url;
    const userAgent = event.headers['User-Agent'];
    const redirectResponse = redirect(userAgent, redirectUrl);
    if (redirectResponse) {
      callback(null, redirectResponse);
      return;
    }
    const articleId = event.pathParameters.id;
    const article = await getArticle(articleId, { getPictures: true, isServer: true });
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
