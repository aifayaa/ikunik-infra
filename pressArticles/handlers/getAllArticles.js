/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import { getArticles } from '../lib/getArticles';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const { category = null, start, limit } = event.queryStringParameters || {};
    await checkPermsForApp(userId, appId, ['admin']);

    const results = await getArticles(category, start, limit, appId, {
      getOrphansArticles: !category,
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
