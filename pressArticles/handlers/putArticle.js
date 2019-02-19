import putArticle from '../lib/putArticle';

export default async (event, context, callback) => {
  try {
    if (!event.body) {
      throw new Error('mal_formed_request');
    }
    const { articleId, categoryId, title, summary, html, md, pictures } = JSON.parse(event.body);
    if (!articleId || !categoryId || !title || !summary || !html || !md || !pictures) {
      throw new Error('mal_formed_request');
    }
    const userId = event.requestContext.authorizer.principalId;
    const results = await putArticle(
      userId,
      articleId,
      categoryId,
      title,
      summary,
      html,
      md,
      pictures,
    );
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
