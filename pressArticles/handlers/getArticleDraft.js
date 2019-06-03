import checkPerms from '../../libs/perms/checkPerms';
import getArticleDraft from '../lib/getArticleDraft';
import response from '../../libs/httpResponses/response';

const permKey = 'pressArticles_all';

export default async (event, context, callback) => {
  try {
    const articleId = event.pathParameters.id;
    const { appId } = event.requestContext.authorizer;
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    if (!checkPerms(permKey, perms)) {
      callback(null, response({ code: 403, message: 'access_forbidden' }));
      return;
    }
    const results = await getArticleDraft(articleId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
