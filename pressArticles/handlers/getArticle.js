import { checkPerms } from '../../libs/perms/checkPerms';
import { getArticle } from '../lib/getArticle';
import response from '../../libs/httpResponses/response';

const permKey = 'pressArticles_all';

export default async (event) => {
  try {
    const articleId = event.pathParameters.id;
    const { appId } = event.requestContext.authorizer;
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const publishedOnly = !checkPerms(permKey, perms);
    const results = await getArticle(articleId, appId, { getPictures: true, publishedOnly });
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
