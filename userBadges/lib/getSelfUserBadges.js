/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import BadgeChecker from '../../libs/badges/BadgeChecker';

const { COLL_EXTERNAL_PURCHASES, COLL_USERS, COLL_USER_BADGES } =
  mongoCollections;

export default async (appId, userId) => {
  const client = await MongoClient.connect();
  const badgeChecker = new BadgeChecker(appId);

  try {
    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId, appId });
    const userBadges = user.badges || [];

    const allBadges = await client
      .db()
      .collection(COLL_USER_BADGES)
      .find({
        appId,
        management: { $in: ['request', 'public', 'private-visible'] },
      })
      .toArray();

    let externalPurchases = await client
      .db()
      .collection(COLL_EXTERNAL_PURCHASES)
      .find(
        {
          appId: user.appId,
          collection: COLL_USER_BADGES,
          userId: user._id,
        },
        { projection: { itemId: 1 } }
      )
      .toArray();

    externalPurchases = externalPurchases.reduce((acc, itm) => {
      acc[itm.itemId] = true;
      return acc;
    }, {});

    const ownedBadges = userBadges.reduce((acc, itm) => {
      if (
        !itm.status ||
        itm.status === 'validated' ||
        itm.status === 'assigned'
      ) {
        acc[itm.id] = true;
      }
      return acc;
    }, {});

    const requestedBadges = userBadges.reduce((acc, itm) => {
      if (itm.status === 'requested') {
        acc[itm.id] = true;
      }
      return acc;
    }, {});

    const rejectedBadges = userBadges.reduce((acc, itm) => {
      if (itm.status === 'rejected') {
        acc[itm.id] = true;
      }
      return acc;
    }, {});

    if (user.crypto) {
      await badgeChecker.init;
      badgeChecker.registerBadges(userBadges.map(({ id: badgeId }) => badgeId));
      await badgeChecker.loadBadges();
    }

    let filteredBadges = await Promise.all(
      allBadges.map(
        async ({
          _id,
          name,
          description,
          color,
          management,
          privacyPolicyUrl,
          storeProductId,
          subscriptionUrl,
        }) => {
          const ret = {
            _id,
            name,
            description,
            color,
            management,
            privacyPolicyUrl,
            storeProductId,
            subscriptionUrl,
          };

          if (requestedBadges[_id]) {
            ret.requested = true;
          }
          if (rejectedBadges[_id]) {
            ret.rejected = true;
          }
          if (ownedBadges[_id]) {
            ret.owned = true;
          } else if (user.crypto) {
            const opts = {
              appId,
              userId,
              articleId: null,
              categoryId: null,
            };
            const checkerResults = await badgeChecker.checkBadges(
              userBadges,
              { allow: 'all', list: [{ id: _id }] },
              opts
            );

            if (checkerResults.canRead) {
              ret.owned = true;
            }
          } else if (externalPurchases[_id]) {
            ret.owned = true;
            ret.externallyOwned = true;
          }

          return ret;
        }
      )
    );

    filteredBadges = filteredBadges.filter((badge) => {
      if (!badge.owned && badge.management === 'private-visible') {
        return false;
      }
      return true;
    });

    return filteredBadges;
  } finally {
    badgeChecker.close();
    client.close();
  }
};
