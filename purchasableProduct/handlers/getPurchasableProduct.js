import errorMessage from '../../libs/httpResponses/errorMessage';
import getPerms from '../../libs/perms/getPerms';
import getPurchasableProduct from '../lib/getPurchasableProduct';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'purchasableProduct_get';

export default async (event) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const productId = event.pathParameters.id;

    const perms = await getPerms(userId, appId);
    if (!checkPerms(permKey, perms)) {
      throw new Error('access_forbidden');
    }

    const results = await getPurchasableProduct(appId, productId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
