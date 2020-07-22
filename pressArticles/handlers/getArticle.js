import { checkPerms } from '../../libs/perms/checkPerms';
import { getArticle } from '../lib/getArticle';
import response from '../../libs/httpResponses/response';

const permKey = 'pressArticles_all';

export default async (event) => {
  try {
    const { id: articleId } = event.pathParameters;
    const {
      appId,
      perms,
      principalId: userId,
    } = event.requestContext.authorizer;

    const permissions = JSON.parse(perms);
    const publishedOnly = !checkPerms(permKey, permissions);

    const results = await getArticle(articleId, appId, {
      getPictures: true,
      publishedOnly,
      userId,
    });

    if (!results) {
      return response({ code: 404, message: 'article_not_found' });
    }

    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
