import Lambda from 'aws-sdk/clients/lambda';
import uuidv4 from 'uuid/v4';

const lambda = new Lambda({
  region: process.env.REGION,
});

export const manageArticleProduct = async (appId, userId, previousArticle, price) => {
  let product;
  if (previousArticle.productId) {
    product = await lambda.invoke({
      FunctionName: `purchasableProduct-${process.env.STAGE}-getPurchasableProduct`,
      Payload: JSON.stringify({
        pathParameters: { id: previousArticle.productId },
        requestContext: { authorizer: { principalId: userId, appId } },
      }),
    }).promise();
  } else {
    product = await lambda.invoke({
      FunctionName: `purchasableProduct-${process.env.STAGE}-findPurchasableProduct`,
      Payload: JSON.stringify({
        requestContext: { authorizer: { principalId: userId, appId } },
        contentId: previousArticle._id,
        contentCollection: 'pressArticle',
      }),
    }).promise();
  }

  /* If no price is set but the product exist :
   *  unlink the product and try to remove it if able */
  if (!price && product) {
    await lambda.invoke({
      FunctionName: `purchasableProduct-${process.env.STAGE}-removePurchasableProduct`,
      Payload: JSON.stringify({
        pathParameters: { id: previousArticle.productId },
        requestContext: { authorizer: { principalId: userId, appId } },
      }),
    }).promise();
    return null;
  }

  /* If a price is set but no product was link to the article :
   *  create a product and link it */
  if (price && !product) {
    const productId = uuidv4();
    await lambda.invoke({
      FunctionName: `purchasableProduct-${process.env.STAGE}-postPurchasableProduct`,
      Payload: JSON.stringify({
        _id: productId,
        content: { id: previousArticle._id, collection: 'pressArticle' },
        perms: { all: true, read: false, write: false },
        price,
        requestContext: { authorizer: { principalId: userId, appId } },
        type: 'direct',
      }),
    }).promise();
    return productId;
  }

  /* If a price is set and a product exists :
   *  see if they match, otherwise update the product */
  if (price && product) {
    await lambda.invoke({
      FunctionName: `purchasableProduct-${process.env.STAGE}-patchPurchasableProduct`,
      Payload: JSON.stringify({
        _id: product._id,
        price,
        requestContext: { authorizer: { principalId: userId, appId } },
      }),
    }).promise();
    return product._id;
  }

  return null;
};
