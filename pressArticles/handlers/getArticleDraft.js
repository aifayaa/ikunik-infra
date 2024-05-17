/* eslint-disable import/no-relative-packages */
import { getArticleDraft } from '../lib/getArticleDraft';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const articleId = event.pathParameters.id;
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      return response({ code: 403, message: 'access_forbidden' });
    }
    const results = await getArticleDraft(articleId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
