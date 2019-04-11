import buildResponse from '../../libs/httpResponses/response';
import getArticleDraft from '../lib/getArticleDraft';

export default async (event, context, callback) => {
  try {
    const articleId = event.pathParameters.id;
    const roles = JSON.parse(event.requestContext.authorizer.roles);
    if (!roles.includes('reporter')) {
      callback(null, buildResponse({ code: 403, message: 'access forbidden' }));
      return;
    }
    const results = await getArticleDraft(articleId);
    callback(null, buildResponse({ code: 200, body: results }));
  } catch (e) {
    callback(null, buildResponse({ code: 500, message: e.message }));
  }
};
