import checkPerms from '../../libs/perms/checkPerms';
import removeArticle from '../lib/removeArticle';
import response from '../../libs/httpResponses/response';

const permKey = 'pressArticles_all';

export default async (event, context, callback) => {
  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    const { appId } = event.requestContext.authorizer;
    if (!checkPerms(permKey, perms)) {
      callback(null, response({ code: 403, message: 'access_forbidden' }));
      return;
    }
    const userId = event.requestContext.authorizer.principalId;
    const articleId = event.pathParameters.id;
    const results = await removeArticle(userId, appId, articleId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
