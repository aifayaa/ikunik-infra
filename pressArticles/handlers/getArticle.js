/* eslint-disable import/no-relative-packages */
import { getArticle } from '../lib/getArticle';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const { id: articleId } = event.pathParameters;
    const { deviceId = null } = event.queryStringParameters || {};

    const publishedOnly = !(await checkPermsForApp(userId, appId, ['admin'], {
      dontThrow: true,
    }));

    const results = await getArticle(articleId, appId, {
      deviceId,
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
