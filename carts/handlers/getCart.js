import getCart from '../lib/getCart';

export default async (event, context, callback) => {
  const response = {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
  try {
    const cartId = event.pathParameters.id;
    const userId = event.requestContext.authorizer.principalId;
    const result = await getCart(cartId, userId, { status: 'pending' });
    if (!result) throw new Error('cart_not_found');
    response.statusCode = 200;
    response.body = JSON.stringify(result);
  } catch (e) {
    switch (e.message) {
      case 'cart_not_found':
        response.statusCode = 404;
        break;
      default:
        response.statusCode = 500;
        break;
    }
    response.body = JSON.stringify({ message: e.message });
  } finally {
    callback(null, response);
  }
};
