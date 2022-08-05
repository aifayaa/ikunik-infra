import mongoCollections from '../../libs/mongoCollections.json';
import badgePrices from '../badgePrices.json';
import response from '../../libs/httpResponses/response';
import { setBalance } from '../../userBalances/lib/setBalance';
import getBadge from '../lib/getUserBadge';
import { getBalance } from '../../userBalances/lib/getBalance';
import { setContentPermissions } from '../../contentPermissions/lib/setContentPermissions';
import toggleUserBadgeToUser from '../lib/toggleUserBadgeToUser';

const { COLL_USER_BADGES } = mongoCollections;

export default async (event) => {
  const badgeId = event.pathParameters.id;
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const badge = await getBadge(badgeId, appId);

    if (!badge) {
      throw new Error('badge_not_found');
    }

    const price = badgePrices[badge.storeProductId];

    if (!badge.storeProductId || !price) {
      throw new Error('product_not_found');
    }

    const balance = await getBalance(appId, userId, { type: badge.storeProductId });

    if (!balance || price > balance.amount) {
      throw new Error('not_enough_wealth');
    }

    const operationStatus = await setBalance(appId, userId, 0, { type: badge.storeProductId });
    if (!operationStatus) {
      throw new Error('balance_update_failed');
    }

    const results = await setContentPermissions(appId, userId, badgeId, COLL_USER_BADGES, {
      permissions: { all: false, read: true, write: false },
    });

    await toggleUserBadgeToUser(badgeId, appId, { action: 'add', userId });

    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
