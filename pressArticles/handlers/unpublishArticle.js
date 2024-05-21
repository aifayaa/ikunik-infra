/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import { unpublishArticle } from '../lib/unpublishArticle';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    await checkPermsForApp(userId, appId, ['admin']);

    const articleId = event.pathParameters.id;
    const results = await unpublishArticle(userId, appId, articleId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
