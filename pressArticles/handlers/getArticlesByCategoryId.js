/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import { getArticlesByCategoryId } from '../lib/getArticlesByCategoryId';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      return response({ code: 403, message: 'access_forbidden' });
    }

    const { category = null, start, limit } = event.queryStringParameters || {};

    if (!category) {
      return response({
        code: 400,
        message: 'Query string "category" is missing',
      });
    }

    const results = await getArticlesByCategoryId(
      category,
      start,
      limit,
      appId,
      {
        getOrphansArticles: !category,
        onlyPublished: false,
        showHiddenOnFeed: true,
        showWithHiddenCategories: true,
        userId,
      }
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
