import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import { getArticles } from '../lib/getArticles';

const permKey = 'pressArticles_all';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { category = null, start, limit } = event.queryStringParameters || {};
    if (!checkPerms(permKey, perms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }
    const results = await getArticles(category, start, limit, appId, {
      admin: true,
      getOrphansArticles: (!category),
      onlyPublished: false,
      showHiddenOnFeed: true,
      showWithHiddenCategories: true,
      userId,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
