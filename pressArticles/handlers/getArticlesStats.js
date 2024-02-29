/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import getArticlesStats from '../lib/getArticlesStats';

const permKey = 'pressArticles_all';

export default async (event) => {
  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { appId } = event.requestContext.authorizer;
    if (!checkPerms(permKey, perms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }
    const stats = await getArticlesStats(appId);
    return response({ code: 200, body: stats });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
