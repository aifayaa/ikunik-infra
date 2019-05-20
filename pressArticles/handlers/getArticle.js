import getArticle from '../lib/getArticle';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  try {
    const articleId = event.pathParameters.id;
    const { appId } = event.requestContext.authorizer;
    const results = await getArticle(articleId, appId, { getPictures: true });
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
