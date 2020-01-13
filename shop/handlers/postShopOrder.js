import postShopOrder from '../lib/postShopOrder';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;
  const productId = event.pathParameters.id;

  try {
    const data = JSON.parse(event.body);
    const {
      qty,
      address,
      variantId,
    } = data;

    if (!data || !qty || !address || !variantId) {
      throw new Error('Mal formed request');
    }
    const results = await postShopOrder(userId, productId, qty, address, variantId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
