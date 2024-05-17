/* eslint-disable import/no-relative-packages */
import { getArticleDraft } from '../lib/getArticleDraft';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const articleId = event.pathParameters.id;
    await checkPermsForApp(userId, appId, ['admin']);

    const results = await getArticleDraft(articleId, appId);
    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  }
};
