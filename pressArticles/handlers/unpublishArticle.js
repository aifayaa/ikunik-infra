import buildResponse from '../../libs/httpResponses/response';
import unpublishArticle from '../lib/unpublishArticle';

export default async (event, context, callback) => {
  try {
    const roles = JSON.parse(event.requestContext.authorizer.roles);
    if (!roles.includes('reporter')) {
      callback(null, buildResponse({ code: 403, message: 'access forbidden' }));
      return;
    }
    const userId = event.requestContext.authorizer.principalId;
    const articleId = event.pathParameters.id;
    const results = await unpublishArticle(userId, articleId);
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
