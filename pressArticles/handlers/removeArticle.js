/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import { removeArticle } from '../lib/removeArticle';
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    try {
      await checkFeaturePermsForApp(userId, appId, ['articlesEditor']);
    } catch (e) {
      await checkPermsForApp(userId, appId, ['admin']);
    }

    const articleId = event.pathParameters.id;
    const results = await removeArticle(userId, appId, articleId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
