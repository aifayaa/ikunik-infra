import getArticleDraft from '../lib/getArticleDraft';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  try {
    const articleId = event.pathParameters.id;
    const { appId } = event.requestContext.authorizer;
    const roles = JSON.parse(event.requestContext.authorizer.roles);
    if (!roles.includes('reporter')) {
      callback(null, response({ code: 403, message: 'access forbidden' }));
      return;
    }
    const results = await getArticleDraft(articleId, appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
