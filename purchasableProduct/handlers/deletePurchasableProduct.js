import errorMessage from '../../libs/httpResponses/errorMessage';
import { deletePurchasableProduct } from '../lib/deletePurchasableProduct';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'purchasableProducts_delete';

export default async (event) => {
  const {
    appId,
    perms,
    principalId: userId,
  } = event.requestContext.authorizer;
  const productId = event.pathParameters.id;

  try {
    const permissions = JSON.parse(perms);
    if (!checkPerms(permKey, permissions)) {
      throw new Error('access_forbidden');
    }

    // @TODO: ENSURE NOTHING HAS BEEN PURCHASE YET WITH THAT PRODUCT
    const results = await deletePurchasableProduct(
      appId,
      userId,
      productId,
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
