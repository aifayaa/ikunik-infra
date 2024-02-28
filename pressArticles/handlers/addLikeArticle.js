/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';
import { checkPerms } from '../../libs/perms/checkPerms';
import { incArticleLikesViews } from '../lib/incArticleLikesViews';

const permKey = 'pressArticles_all';

export default async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { id: articleId } = event.pathParameters;
    let likes = 1;

    if (checkPerms(permKey, perms)) {
      const bodyParsed = JSON.parse(event.body);
      ({ likes } = bodyParsed);
    }

    await incArticleLikesViews(appId, articleId, { likes });
    return response({ code: 200, body: true });
  } catch (e) {
    return response(errorMessage(e));
  }
};
