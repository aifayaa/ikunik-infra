import payByStripe from '../lib/payByStripe';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;

  if (!event.body) {
    throw new Error('mal_formed_request');
  }

  try {
    const { token, cartId } = JSON.parse(event.body);
    if (!token || !cartId) {
      throw new Error('mal_formed_request');
    }
    const res = await payByStripe(token, cartId, userId);
    return response({ code: 200, body: res });
  } catch (e) {
    return response({ code: 200, message: e.message });
  }
};
