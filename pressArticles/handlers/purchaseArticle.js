import articlePrices from '../articlePrices.json';
import response from '../../libs/httpResponses/response';
import { addBalance } from '../../userBalances/lib/addBalance';
import { getArticle } from '../lib/getArticle';
import { getBalance } from '../../userBalances/lib/getBalance';
import { setContentPermissions } from '../../contentPermissions/lib/setContentPermissions';

const { COLL_PRESS_ARTICLES } = process.env;

export default async (event) => {
  const articleId = event.pathParameters.id;
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const article = await getArticle(articleId, appId);

    if (!article) {
      throw new Error('article_not_found');
    }

    const price = articlePrices[article.storeProductId];

    if (!article.storeProductId || !price) {
      throw new Error('product_not_found');
    }

    const balance = await getBalance(appId, userId);

    if (!balance || price > balance.amount) {
      throw new Error('not_enough_wealth');
    }

    const operationStatus = await addBalance(appId, userId, price * -1);
    if (!operationStatus) {
      throw new Error('balance_update_failed');
    }

    const results = await setContentPermissions(appId, userId, articleId, COLL_PRESS_ARTICLES, {
      permissions: { all: false, read: true, write: false },
    });

    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
