import buildResponse from '../../libs/httpResponses/response';
import getArticles from '../lib/getArticles';

export default async (event, context, callback) => {
  try {
    const roles = JSON.parse(event.requestContext.authorizer.roles);
    const { category, start, limit } = event.queryStringParameters || {};
    if (!roles.includes('reporter')) {
      callback(null, buildResponse({ code: 403, message: 'access forbidden' }));
      return;
    }
    const results = await getArticles(category, start, limit, { onlyPublished: false });
    callback(null, buildResponse({ code: 200, body: results }));
  } catch (e) {
    callback(null, buildResponse({ code: 500, message: e.message }));
  }
};
