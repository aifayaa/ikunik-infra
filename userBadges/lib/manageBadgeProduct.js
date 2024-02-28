/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import uuidv4 from 'uuid/v4';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_BADGES } = mongoCollections;

const lambda = new Lambda({
  region: process.env.REGION,
});

const processLambdaResponse = (response) => {
  const { Payload } = response;
  const { statusCode, body } = JSON.parse(Payload);
  const bodyParsed = JSON.parse(body);
  return { Payload, statusCode, body: bodyParsed };
};

export const manageBadgeProduct = async (
  appId,
  userId,
  previousBadge,
  price,
  storeProductId
) => {
  const getRequestContext = (key) => ({
    authorizer: {
      appId,
      perms: `{ "${key}": true }`,
      principalId: userId,
    },
  });

  let lambdaResponse;
  let body;
  let statusCode;

  if (previousBadge.productId) {
    lambdaResponse = await lambda
      .invoke({
        FunctionName: `purchasableProducts-${process.env.STAGE}-getPurchasableProduct`,
        Payload: JSON.stringify({
          pathParameters: { id: previousBadge.productId },
          requestContext: getRequestContext('purchasableProducts_get'),
        }),
      })
      .promise();
  } else {
    lambdaResponse = await lambda
      .invoke({
        FunctionName: `purchasableProducts-${process.env.STAGE}-findPurchasableProduct`,
        Payload: JSON.stringify({
          queryStringParameters: {
            contentId: previousBadge._id,
            contentCollection: COLL_USER_BADGES,
          },
          requestContext: getRequestContext('purchasableProducts_find'),
        }),
      })
      .promise();
  }
  ({ statusCode, body } = processLambdaResponse(lambdaResponse));
  if (statusCode !== 200) {
    throw new Error(body.message);
  }
  const product = Object.keys(body).length ? body : null;
  const priceIsNull = !price || parseFloat(price) === 0;

  /* If no price is set but the product exist :
   *  unlink the product and try to delete it if able */
  if (priceIsNull && product) {
    lambdaResponse = await lambda
      .invoke({
        FunctionName: `purchasableProducts-${process.env.STAGE}-deletePurchasableProduct`,
        Payload: JSON.stringify({
          pathParameters: { id: previousBadge.productId },
          requestContext: getRequestContext('purchasableProducts_delete'),
        }),
      })
      .promise();
    ({ statusCode, body } = processLambdaResponse(lambdaResponse));
    if (statusCode !== 200) {
      throw new Error(body.message);
    }
    return null;
  }

  /* If a price is set but no product was link to the badge :
   *  create a product and link it */
  if (!priceIsNull && !product) {
    const productId = uuidv4();
    lambdaResponse = await lambda
      .invoke({
        FunctionName: `purchasableProducts-${process.env.STAGE}-postPurchasableProduct`,
        Payload: JSON.stringify({
          body: JSON.stringify({
            _id: productId,
            contents: [
              {
                id: previousBadge._id,
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
          requestContext: getRequestContext('purchasableProducts_post'),
        }),
      })
      .promise();
    ({ statusCode, body } = processLambdaResponse(lambdaResponse));
    if (statusCode !== 200) {
      throw new Error(body.message);
    }
    return productId;
  }

  /* If a price is set and a product exists :
   *  see if they match, otherwise update the product */
  if (!priceIsNull && product) {
    lambdaResponse = await lambda
      .invoke({
        FunctionName: `purchasableProducts-${process.env.STAGE}-patchPurchasableProduct`,
        Payload: JSON.stringify({
          body: JSON.stringify({
            options: {
              appleProductId: storeProductId,
              googleProductId: storeProductId,
            },
            price,
          }),
          pathParameters: { id: product._id },
          requestContext: getRequestContext('purchasableProducts_patch'),
        }),
      })
      .promise();
    ({ statusCode, body } = processLambdaResponse(lambdaResponse));
    if (statusCode !== 200) {
      throw new Error(body.message);
    }

    return product._id;
  }

  return null;
};
