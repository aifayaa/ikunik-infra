/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import { findPurchasableProduct } from '../lib/findPurchasableProduct';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const queryParams = event.queryStringParameters || {};
  const { contentId, contentCollection } = queryParams;

  try {
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    if (!contentId || !contentCollection) {
      throw new Error('missing_argument');
    }

    if (
      typeof contentId !== 'string' ||
      typeof contentCollection !== 'string'
    ) {
      throw new Error('wrong_argument_type');
    }

    const results = await findPurchasableProduct(appId, {
      contentCollection,
      contentId,
    });
    return response({ code: 200, body: results || {} });
  } catch (e) {
    return response(errorMessage(e));
  }
};
