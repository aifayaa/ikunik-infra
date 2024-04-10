/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import getArticlesStats from '../lib/getArticlesStats';
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

    const allowed = await checkPermsForApp(userId, appId, 'admin');
    console.log('handler: PASS 1');
    if (!allowed) {
      return response({ code: 403, message: 'access_forbidden' });
    }
    console.log('handler: PASS 2');
    const stats = await getArticlesStats(appId);
    console.log('handler: PASS 3');
    return response({ code: 200, body: stats });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
