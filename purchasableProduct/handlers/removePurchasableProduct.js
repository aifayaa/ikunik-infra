import errorMessage from '../../libs/httpResponses/errorMessage';
import removePurchasableProduct from '../lib/removePurchasableProduct';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;
  const productId = event.pathParameters.id;

  try {
    // @TODO: ENSURE NOTHING HAS BEEN PURCHASE YET WITH THAT PRODUCT
    const results = await removePurchasableProduct(
      appId,
      userId,
      productId,
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
