/* eslint-disable import/no-relative-packages */
import { getPurchasableProduct } from '../lib/getPurchasableProduct';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const productId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const results = await getPurchasableProduct(appId, productId);
    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  }
};
