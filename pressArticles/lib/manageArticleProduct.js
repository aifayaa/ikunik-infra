import Lambda from 'aws-sdk/clients/lambda';
import uuidv4 from 'uuid/v4';

const lambda = new Lambda({
  region: process.env.REGION,
});

const processLambdaResponse = (response) => {
  const { Payload } = response;
  const { statusCode, body } = JSON.parse(Payload);
  const bodyParsed = JSON.parse(body);
  return { Payload, statusCode, body: bodyParsed };
};

export const manageArticleProduct = async (appId, userId, previousArticle, price) => {
  const getRequestContext = (key) => ({ authorizer: {
    appId,
    perms: `{ "${key}": true }`,
    principalId: userId,
  } });

  let lambdaResponse;
  let body;
  let statusCode;

  if (previousArticle.productId) {
    lambdaResponse = await lambda.invoke({
      FunctionName: `purchasableProduct-${process.env.STAGE}-getPurchasableProduct`,
      Payload: JSON.stringify({
        pathParameters: { id: previousArticle.productId },
        requestContext: getRequestContext('purchasableProduct_get'),
      }),
    }).promise();
  } else {
    lambdaResponse = await lambda.invoke({
      FunctionName: `purchasableProduct-${process.env.STAGE}-findPurchasableProduct`,
      Payload: JSON.stringify({
        queryStringParameters: {
          contentId: previousArticle._id,
          contentCollection: 'pressArticle',
        },
        requestContext: getRequestContext('purchasableProduct_find'),
      }),
    }).promise();
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
    lambdaResponse = await lambda.invoke({
      FunctionName: `purchasableProduct-${process.env.STAGE}-deletePurchasableProduct`,
      Payload: JSON.stringify({
        pathParameters: { id: previousArticle.productId },
        requestContext: getRequestContext('purchasableProduct_delete'),
      }),
    }).promise();
    ({ statusCode, body } = processLambdaResponse(lambdaResponse));
    if (statusCode !== 200) {
      throw new Error(body.message);
    }
    return null;
  }

  /* If a price is set but no product was link to the article :
   *  create a product and link it */
  if (!priceIsNull && !product) {
    const productId = uuidv4();
    lambdaResponse = await lambda.invoke({
      FunctionName: `purchasableProduct-${process.env.STAGE}-postPurchasableProduct`,
      Payload: JSON.stringify({
        body: JSON.stringify({
          _id: productId,
          content: [{ id: previousArticle._id, collection: 'pressArticle' }],
          perms: { all: true, read: false, write: false },
          price,
          type: 'direct',
        }),
        requestContext: getRequestContext('purchasableProduct_post'),
      }),
    }).promise();
    ({ statusCode, body } = processLambdaResponse(lambdaResponse));
    if (statusCode !== 200) {
      throw new Error(body.message);
    }
    return productId;
  }

  /* If a price is set and a product exists :
   *  see if they match, otherwise update the product */
  if (!priceIsNull && product) {
    lambdaResponse = await lambda.invoke({
      FunctionName: `purchasableProduct-${process.env.STAGE}-patchPurchasableProduct`,
      Payload: JSON.stringify({
        body: JSON.stringify({ price }),
        pathParameters: { id: product._id },
        requestContext: getRequestContext('purchasableProduct_patch'),
      }),
    }).promise();
    ({ statusCode, body } = processLambdaResponse(lambdaResponse));
    if (statusCode !== 200) {
      throw new Error(body.message);
    }

    return product._id;
  }

  return null;
};
