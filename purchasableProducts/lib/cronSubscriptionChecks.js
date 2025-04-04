import get from 'lodash/get';

import MongoClient from '../../libs/mongoClient';
import validatePurchase from './validatePurchase';
import { promiseExecUntilTrue } from '../../libs/utils';
import mongoCollections from '../../libs/mongoCollections.json';
import badgePrices from '../../userBadges/badgePrices.json';

const { COLL_APPS, COLL_PURCHASES, COLL_USER_BADGES, COLL_USERS } =
  mongoCollections;

async function ensureBadgeForUserIs(active, { badge, user, client }) {
  const userBadges = user.badges || [];
  const userBadge = userBadges.find(({ id }) => id === badge._id);

  if (active) {
    if (!userBadge) {
      // eslint-disable-next-line no-console
      console.log(
        `VERBOSE adding badge for user=${user._id} badge=${badge._id} app=${badge.appId}`
      );
      await client
        .db()
        .collection(COLL_USERS)
        .updateOne(
          { _id: user._id },
          {
            $addToSet: {
              badges: {
                id: badge._id,
                status: 'assigned',
                addedAt: new Date(),
                addedBy: null,
                addedByIapCron: true,
              },
            },
          }
        );
    } else if (
      userBadge.status !== 'validated' &&
      userBadge.status !== 'assigned'
    ) {
      // eslint-disable-next-line no-console
      console.log(
        `VERBOSE enabling badge for user=${user._id} badge=${badge._id} app=${badge.appId}`
      );
      await client
        .db()
        .collection(COLL_USERS)
        .updateOne(
          { _id: user._id, 'badges.id': badge._id },
          {
            $set: {
              'badges.$': {
                id: badge._id,
                status: 'assigned',
                addedAt: new Date(),
                addedBy: null,
                addedByIapCron: true,
              },
            },
          }
        );
    }
  } else {
    if (
      userBadge /* &&
      (userBadge.status === 'validated' || userBadge.status === 'assigned') */
    ) {
      // eslint-disable-next-line no-console
      console.log(
        `VERBOSE removing badge for user=${user._id} badge=${badge._id} app=${badge.appId}`
      );
      await client
        .db()
        .collection(COLL_USERS)
        .updateOne({ _id: user._id }, { $pull: { badges: { id: badge._id } } });
    }
  }
}

async function getPurchaseStatus(purchase, { appId }) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const checkedAt = get(purchase, 'status.checkedAt', new Date(0));

  if (checkedAt > oneHourAgo) {
    const {
      isValidated = false,
      isCanceled = false,
      isExpired = false,
    } = purchase.status || {};

    return {
      isValidated,
      isCanceled,
      isExpired,
      fromCache: true,
    };
  }

  const { isValidated, isCanceled, isExpired } = await validatePurchase(
    appId,
    JSON.parse(purchase.request),
    { verbose: false }
  );

  return {
    isValidated,
    isCanceled,
    isExpired,
    fromCache: false,
  };
}

async function runValidationForBadge(badge, { client, lambdaContext }) {
  const purchasesCursor = await client
    .db()
    .collection(COLL_PURCHASES)
    .find({
      appId: badge.appId,
      productId: badge.storeProductId,
      userId: { $ne: null },
      'status.isValidated': { $ne: false },
    });

  // TODO Browse purchases and collect users locally for a mass update at the end.

  const userPurchasesMap = {};

  await promiseExecUntilTrue(async () => {
    if (lambdaContext.getRemainingTimeInMillis() < 30 * 1000) {
      throw new Error('Nearing lambda timeout, stopping execution');
    }
    const hasNext = await purchasesCursor.hasNext();
    if (!hasNext) return true;
    const purchase = await purchasesCursor.next();
    if (purchase === null) return true;

    const { userId } = purchase;

    if (userPurchasesMap[userId]) return true;

    const $set = {};
    let active = false;

    try {
      const { isValidated, isCanceled, isExpired, fromCache } =
        await getPurchaseStatus(purchase, {
          appId: badge.appId,
        });
      if (isValidated && !isCanceled && !isExpired) {
        active = true;
      }
      if (!fromCache) {
        $set.status = {
          checkedAt: new Date(),
          isValidated,
          isCanceled,
          isExpired,
        };
      }
    } catch (e) {
      if (typeof e === 'string') {
        const parsedError = JSON.parse(e);
        const reason = get(parsedError, 'message.error.errors[0].reason');
        if (reason === 'subscriptionPurchaseNoLongerAvailable') {
          const message = get(parsedError, 'message.error.errors[0].message');
          $set.status = {
            checkedAt: new Date(),
            isValidated: false,
            details: {
              message,
              reason,
            },
          };
        } else {
          // eslint-disable-next-line no-console
          console.error(
            `VERBOSE check error for purchase=${purchase._id} (unknown type)`,
            parsedError
          );
        }
      } else {
        // eslint-disable-next-line no-console
        console.error(
          `VERBOSE check error for purchase=${purchase._id} (not a string)`,
          e
        );
      }
    }

    userPurchasesMap[userId] = active;

    if ($set.status) {
      await client
        .db()
        .collection(COLL_PURCHASES)
        .updateOne({ _id: purchase._id }, { $set });
    }

    return false;
  });

  const userIds = Object.keys(userPurchasesMap);

  await promiseExecUntilTrue(async () => {
    if (userIds.length === 0) return true;

    const userId = userIds.shift();
    const active = userPurchasesMap[userId];

    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId, appId: badge.appId });

    if (!user) return false;

    await ensureBadgeForUserIs(active, { badge, user, client });

    return false;
  });
}

export async function cronSubscriptionChecks(lambdaContext) {
  const client = await MongoClient.connect();

  try {
    const appsWithIap = await client
      .db()
      .collection(COLL_APPS)
      .find({
        'settings.iap': { $exists: true },
      })
      .toArray();

    const badgesCursor = await client
      .db()
      .collection(COLL_USER_BADGES)
      .find({
        appId: { $in: appsWithIap.map(({ _id }) => _id) },
        storeProductId: {
          $in: Object.keys(badgePrices).filter((x) => x),
        },
      });

    await promiseExecUntilTrue(async () => {
      const hasNextBadge = await badgesCursor.hasNext();
      if (!hasNextBadge) return true;
      const badge = await badgesCursor.next();
      if (badge === null) return true;

      await runValidationForBadge(badge, { client, lambdaContext });

      return false;
    });
  } finally {
    await client.close();
  }
}
