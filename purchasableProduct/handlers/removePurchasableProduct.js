import errorMessage from '../../libs/httpResponses/errorMessage';
import { removePurchasableProduct } from '../lib/removePurchasableProduct';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'purchasableProduct_remove';

export default async (event) => {
  const { appId, perms } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;
  const productId = event.pathParameters.id;

  try {
    const permissions = JSON.parse(perms);
    if (!checkPerms(permKey, permissions)) {
      throw new Error('access_forbidden');
    }

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
