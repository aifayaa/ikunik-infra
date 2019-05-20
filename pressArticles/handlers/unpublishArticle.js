import response from '../../libs/httpResponses/response';
import unpublishArticle from '../lib/unpublishArticle';

export default async (event, context, callback) => {
  try {
    const roles = JSON.parse(event.requestContext.authorizer.roles);
    const { appId } = event.requestContext.authorizer;
    if (!roles.includes('reporter')) {
      callback(null, response({ code: 403, message: 'access forbidden' }));
      return;
    }
    const userId = event.requestContext.authorizer.principalId;
    const articleId = event.pathParameters.id;
    const results = await unpublishArticle(userId, appId, articleId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
