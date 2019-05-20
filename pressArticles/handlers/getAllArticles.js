import getArticles from '../lib/getArticles';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  try {
    const roles = JSON.parse(event.requestContext.authorizer.roles);
    const { appId } = event.requestContext.authorizer;
    const { category, start, limit } = event.queryStringParameters || {};
    if (!roles.includes('reporter')) {
      callback(null, response({ code: 403, message: 'access forbidden' }));
      return;
    }
    const results = await getArticles(category, start, limit, appId, { onlyPublished: false });
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
