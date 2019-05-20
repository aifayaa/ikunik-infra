import createCart from '../lib/createCart';

export default async (event, context, callback) => {
  const response = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
  try {
    const { appId } = event.requestContext.authorizer;
    const userId = event.requestContext.authorizer.principalId;
    if (!event.body) {
      throw new Error('mal_formed_request');
    }
    const { items } = JSON.parse(event.body);
    if (!items) {
      throw new Error('mal_formed_request');
    }
    const result = await createCart(userId, appId, items);
    response.statusCode = 200;
    response.body = JSON.stringify(result);
  } catch (e) {
    response.statusCode = 500;
    response.body = JSON.stringify({ message: e.message });
  } finally {
    callback(null, response);
  }
};
