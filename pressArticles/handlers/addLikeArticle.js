/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { incArticleLikesViews } from '../lib/incArticleLikesViews';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const { id: articleId } = event.pathParameters;
    let likes = 1;

    await checkPermsForApp(userId, appId, ['admin']);

    const bodyParsed = JSON.parse(event.body);
    ({ likes } = bodyParsed);

    await incArticleLikesViews(appId, articleId, { likes });
    return response({ code: 200, body: true });
  } catch (e) {
    return response(errorMessage(e));
  }
};
