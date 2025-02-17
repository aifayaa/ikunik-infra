/* eslint-disable import/no-relative-packages */
import { deletePurchasableProduct } from '../lib/deletePurchasableProduct';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const productId = event.pathParameters.id;

  try {
    try {
      await checkFeaturePermsForApp(userId, appId, ['articlesEditor']);
    } catch (e) {
      await checkPermsForApp(userId, appId, ['admin']);
    }

    // @TODO: ENSURE NOTHING HAS BEEN PURCHASE YET WITH THAT PRODUCT
    const results = await deletePurchasableProduct(appId, userId, productId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
