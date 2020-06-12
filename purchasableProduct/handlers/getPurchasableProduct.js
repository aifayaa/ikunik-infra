import errorMessage from '../../libs/httpResponses/errorMessage';
import { getPurchasableProduct } from '../lib/getPurchasableProduct';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'purchasableProduct_get';

export default async (event) => {
  const { appId, perms } = event.requestContext.authorizer;
  const productId = event.pathParameters.id;

  try {
    const permissions = JSON.parse(perms);
    if (!checkPerms(permKey, permissions)) {
      throw new Error('access_forbidden');
    }

    const results = await getPurchasableProduct(appId, productId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
