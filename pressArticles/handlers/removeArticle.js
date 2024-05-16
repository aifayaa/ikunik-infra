/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import { removeArticle } from '../lib/removeArticle';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    await checkPermsForApp(userId, appId, ['admin']);

    const articleId = event.pathParameters.id;
    const results = await removeArticle(userId, appId, articleId);
    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  }
};
