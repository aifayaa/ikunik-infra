/* eslint-disable import/no-relative-packages */
import response, { handleException } from '../../libs/httpResponses/response';
import { incArticleLikesViews } from '../lib/incArticleLikesViews';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const { id: articleId } = event.pathParameters;
    let views = 1;

    await checkPermsForApp(userId, appId, ['admin']);

    const bodyParsed = JSON.parse(event.body);
    ({ views } = bodyParsed);

    await incArticleLikesViews(appId, articleId, { views });
    return response({ code: 200, body: true });
  } catch (exception) {
    return handleException(exception);
  }
};
