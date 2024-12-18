/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import badgePrices from '../badgePrices.json';
import { manageBadgeProduct } from './manageBadgeProduct';

const { COLL_USER_BADGES } = mongoCollections;

export default async (
  userBadgeId,
  appId,
  {
    access,
    color = '#FFFFFF',
    description = '',
    isDefault,
    management,
    name,
    privacyPolicyUrl = null,
    productId: storeProductId,
    subscriptionUrl = null,
  },
  { userId }
) => {
  const client = await MongoClient.connect();

  try {
    if (!name) throw new Error('missing_user_badge_name');
    const userBadgeObj = await client
      .db()
      .collection(COLL_USER_BADGES)
      .findOne({
        _id: userBadgeId,
        appId,
      });

    if (!userBadgeObj) {
      throw new Error('content_not_found');
    }

    if (storeProductId) {
      const existingPriceBadge = await client
        .db()
        .collection(COLL_USER_BADGES)
        .findOne({ _id: { $ne: userBadgeId }, appId, storeProductId });

      if (existingPriceBadge) {
        throw new Error('duplicate_user_badge_iap_product');
      }
    }

    if (userBadgeObj.name !== name) {
      const existingObj = await client
        .db()
        .collection(COLL_USER_BADGES)
        .findOne({ appId, name });

      if (existingObj) {
        throw new Error('duplicate_user_badge');
      }
    }

    const price = badgePrices[storeProductId];
    const productId = await manageBadgeProduct(
      appId,
      userId,
      userBadgeObj,
      price,
      storeProductId
    );

    const $set = {
      name,
      updatedAt: new Date(),

      access,
      color,
      description,
      isDefault,
      management,
      productId,
      storeProductId,
    };

    if (subscriptionUrl !== null) {
      $set.subscriptionUrl = subscriptionUrl;
    }
    if (privacyPolicyUrl !== null) {
      $set.privacyPolicyUrl = privacyPolicyUrl;
    }

    await client.db().collection(COLL_USER_BADGES).updateOne(
      {
        _id: userBadgeId,
        appId,
      },
      { $set }
    );

    return { ...userBadgeObj, ...$set };
  } finally {
    client.close();
  }
};
