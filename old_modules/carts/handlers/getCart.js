import getCart from '../lib/getCart';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const cartId = event.pathParameters.id;
    const userId = event.requestContext.authorizer.principalId;
    const result = await getCart(cartId, userId, appId, { status: 'pending' });
    if (!result) throw new Error('cart_not_found');
    return response({ code: 200, body: result });
  } catch (e) {
    let code;
    switch (e.message) {
      case 'cart_not_found':
        code = 404;
        break;
      default:
        code = 500;
        break;
    }
    return response({ code, message: e.message });
  }
};
