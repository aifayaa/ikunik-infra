/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import uuidv4 from 'uuid/v4';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import badgePrices from '../badgePrices.json';

const { COLL_USER_BADGES } = mongoCollections;

const lambda = new Lambda({
  region: process.env.REGION,
});

export default async (
  userId,
  appId,
  {
    access,
    color = '#FFFFFF',
    description = '',
    privacyPolicyUrl = '',
    isDefault,
    management,
    name,
    productId: storeProductId,
    subscriptionUrl = '',
  }
) => {
  const client = await MongoClient.connect();

  try {
    if (!name) throw new Error('missing_user_badge_name');

    const existingObj = await client
      .db()
      .collection(COLL_USER_BADGES)
      .findOne({ appId, name });

    if (existingObj) {
      throw new Error('duplicate_user_badge');
    }

    if (storeProductId) {
      const existingPriceBadge = await client
        .db()
        .collection(COLL_USER_BADGES)
        .findOne({ appId, storeProductId });

      if (existingPriceBadge) {
        throw new Error('duplicate_user_badge_iap_product');
      }
    }

    const userBadgeObj = {
      _id: new ObjectID().toString(),
      appId,
      createdAt: new Date(),
      authorId: userId,

      access,
      color,
      description,
      isDefault,
      management,
      name,
      privacyPolicyUrl,
      subscriptionUrl,
    };

    const productId = uuidv4();
    if (storeProductId) {
      userBadgeObj.productId = productId;
      userBadgeObj.storeProductId = storeProductId;
    }
    const price = badgePrices[storeProductId];

    const { insertedId } = await client
      .db()
      .collection(COLL_USER_BADGES)
      .insertOne(userBadgeObj);

    if (storeProductId) {
      await lambda
        .invoke({
          FunctionName: `purchasableProducts-${process.env.STAGE}-postPurchasableProduct`,
          Payload: JSON.stringify({
            body: JSON.stringify({
              _id: productId,
              contents: [
                {
                  id: insertedId,
                  collection: COLL_USER_BADGES,
                  permissions: { all: true },
                },
              ],
              options: {
                appleProductId: storeProductId,
                googleProductId: storeProductId,
              },
              price,
              type: 'direct',
            }),
            requestContext: {
              authorizer: {
                appId,
                perms: '{ "purchasableProducts_post": true }',
                principalId: userId,
              },
            },
          }),
        })
        .promise();
    }

    return userBadgeObj;
  } finally {
    client.close();
  }
};
