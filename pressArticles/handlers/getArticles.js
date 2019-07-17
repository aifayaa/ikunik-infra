import response from '../../libs/httpResponses/response';
import { getArticles } from '../lib/getArticles';

export default async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const { category, start, limit } = event.queryStringParameters || {};
    const results = await getArticles(category, start, limit, appId, { getPictures: true });
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
