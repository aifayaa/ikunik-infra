import getArticles from '../lib/getArticles';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const { category, start, limit } = event.queryStringParameters || {};
    const results = await getArticles(category, start, limit, appId, { getPictures: true });
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
