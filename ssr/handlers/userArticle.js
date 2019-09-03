import buildResponse from '../../libs/httpResponses/response';
import getAppId from '../lib/getAppId';
import getUserGeneratedContents from '../../userGeneratedContents/lib/getUserGeneratedContents';
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
    const articleResults = await getUserGeneratedContents(appId, articleId);
    if (!articleResults || !articleResults.length) throw new Error('article_not_found');
    const article = articleResults[0];
    const pictureUrl = (article.data.pictures[0] && article.data.pictures[0].mediumUrl) || '';
    const body = meta(
      article.data.title,
      prepareNotifString(article.data.content, 120),
      pictureUrl,
    );
    return buildResponse({ code: 200, body });
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
