/* eslint-disable import/no-relative-packages */
import { findPurchasableProduct } from '../lib/findPurchasableProduct';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import {
  checkFeaturePermsForApp,
  checkPermsForApp,
} from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const queryParams = event.queryStringParameters || {};
  const { contentId, contentCollection } = queryParams;

  try {
    try {
      await checkFeaturePermsForApp(userId, appId, ['articlesEditor']);
    } catch (e) {
      await checkPermsForApp(userId, appId, ['admin']);
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
