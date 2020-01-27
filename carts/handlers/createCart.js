import createCart from '../lib/createCart';
import response from '../../libs/httpResponses/response';

export default async (event) => {
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
    return response({ code: 200, body: result });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
