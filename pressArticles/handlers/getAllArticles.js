/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import { getArticles } from '../lib/getArticles';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  console.log('IN handler');
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;
    console.log('handler: PASS 0');
    console.log(
      'handler: event.requestContext.authorizer:',
      event.requestContext.authorizer
    );

    const { category = null, start, limit } = event.queryStringParameters || {};
    console.log('handler: PASS 1');
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    console.log('handler: PASS 2');
    if (!allowed) {
      return response({ code: 403, message: 'access_forbidden' });
    }
    console.log('handler: PASS 3');
    const results = await getArticles(category, start, limit, appId, {
      getOrphansArticles: !category,
      onlyPublished: false,
      showHiddenOnFeed: true,
      showWithHiddenCategories: true,
      userId,
    });
    console.log('handler: PASS 4');
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
