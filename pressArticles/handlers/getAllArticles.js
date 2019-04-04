import getArticles from '../lib/getArticles';

export default async (event, context, callback) => {
  try {
    const rolesTab = JSON.parse(event.requestContext.authorizer.rolesTab);
    const { category, start, limit } = event.queryStringParameters || {};
    if (rolesTab.includes('reporter')) {
      const results = await getArticles(category, start, limit, { onlyPublished: false });
      const response = {
        statusCode: 200,
        body: JSON.stringify(results),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
      };
      callback(null, response);
    }
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
