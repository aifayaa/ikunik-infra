import errorMessage from '../../libs/httpResponses/errorMessage';
import findPurchasableProduct from '../lib/findPurchasableProduct';
import getPerms from '../../libs/perms/getPerms';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'purchasableProduct_find';

export default async (event) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const queryParams = event.queryStringParameters || {};
    const { contentId, contentCollection } = queryParams;

    const perms = await getPerms(userId, appId);
    if (!checkPerms(permKey, perms)) {
      throw new Error('access_forbidden');
    }

    if (!contentId || !contentCollection) {
      throw new Error('missing_argument');
    }

    if (typeof contentId !== 'string' ||
      typeof contentCollection !== 'string'
    ) {
      throw new Error('wrong_argument_type');
    }

    const results = await findPurchasableProduct(
      appId,
      {
        contentCollection,
        contentId,
      },
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
