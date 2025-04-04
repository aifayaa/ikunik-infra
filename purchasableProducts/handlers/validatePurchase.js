/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import { addBalance } from '../../userBalances/lib/addBalance';
import { setBalance } from '../../userBalances/lib/setBalance';
import { addPurchaseHistory } from '../lib/addPurchaseHistory';
import response from '../../libs/httpResponses/response.ts';
import articlePrices from '../../pressArticles/articlePrices.json';
import badgePrices from '../../userBadges/badgePrices.json';
import validatePurchase from '../lib/validatePurchase';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { deviceId = null } = event.queryStringParameters || {};

  const client = await MongoClient.connect();
  try {
    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    const {
      productId,
      isValidated,
      isCanceled,
      isExpired,
      validatedData,
      purchaseData,
    } = await validatePurchase(appId, bodyParsed);

    if (!isValidated) {
      throw new Error('invalid_purchase');
    } else if (isCanceled) {
      throw new Error('canceled_purchase');
    } else if (isExpired) {
      throw new Error('expired_purchase');
    }

    if (articlePrices[productId]) {
      const price = articlePrices[productId];
      // @TODO : checks if price is defined ?

      await addBalance(appId, userId, deviceId, parseFloat(price));
      await addPurchaseHistory({
        appId,
        userId,
        deviceId,
        productId,
        bodyParsed,
        purchaseData,
      });

      const responseBody = { ok: true, data: validatedData };
      return response({ code: 200, body: responseBody });
    }

    if (badgePrices[productId]) {
      const price = badgePrices[productId];

      await setBalance(appId, userId, deviceId, price, { type: productId });
      await addPurchaseHistory({
        appId,
        userId,
        deviceId,
        productId,
        bodyParsed,
        purchaseData,
      });

      const responseBody = { ok: true, data: validatedData };
      return response({ code: 200, body: responseBody });
    }

    return response({ code: 500, message: 'unknown_product_id' });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('Caught error :', e);
    if (typeof e === 'string') {
      try {
        // eslint-disable-next-line no-ex-assign
        e = JSON.parse(e);
      } catch (error) {
        // eslint-disable-next-line no-ex-assign
        e = new Error("Can't parse error");
      }
    }
    return response({ code: 500, message: e.message });
  } finally {
    client.close();
  }
};
