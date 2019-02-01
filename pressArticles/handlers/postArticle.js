import postArticle from '../lib/postArticle';

export default async (event, context, callback) => {
  try {
    if (!event.body) {
      throw new Error('mal_formed_request');
    }
    const { categoryId, title, summary, html, md } = JSON.parse(event.body);
    if (!categoryId || !title || !summary || !html || !md) {
      throw new Error('mal_formed_request');
    }
    const userId = event.requestContext.authorizer.principalId;
    const results = await postArticle(userId, categoryId, title, summary, html, md);
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
