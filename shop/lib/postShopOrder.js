import { MongoClient } from 'mongodb';
import findIndex from 'lodash/findIndex';
import Lambda from 'aws-sdk/clients/lambda';
import uuidv4 from 'uuid';
import validator from 'validator';
import getShopItem from './getShopItem';

const {
  COLL_SHOP_ORDERS,
  DB_NAME,
  MONGO_URL,
  REGION,
  STAGE,
} = process.env;

const lambda = new Lambda({
  region: REGION,
});

export default async (userId, productId, qty, address, variantId, appId) => {
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;

  try {
    /* check if 1 <= qty <=10 */
    if (!validator.isInt(qty, { min: 1, allow_leading_zeroes: false, max: 10 })) {
      throw new Error('Wrong quantity');
    }

    qty = parseInt(qty, 10);
    /* check if the product exist */
    const item = await getShopItem(productId, appId);
    if (!item) throw new Error('Product not found');

    /* check if selected variant exist */
    const { sizes, price } = item;
    if (findIndex(sizes, { variantId: parseInt(variantId, 10) }) === -1) {
      throw new Error('Product variant not found');
    }

    /* check if user account contain enough credits */
    const total = price * qty;
    const getCreditsParams = {
      FunctionName: `credits-${STAGE}-getCredits`,
      Payload: JSON.stringify({ requestContext: { authorizer: { principalId: userId, appId } } }),
    };

    let { Payload } = await lambda.invoke(getCreditsParams).promise();
    let { statusCode, body } = JSON.parse(Payload);
    if (statusCode !== 200) throw new Error(`Unable to get credits with status ${statusCode}`);
    if (!body) throw new Error('Credits body is missing');
    const { credits } = JSON.parse(body);
    if (credits < total) throw new Error('Not enough credits');

    /* remove credits from user acount */
    const removeCreditsParams = {
      FunctionName: `credits-${STAGE}-removeCredits`,
      Payload: JSON.stringify({
        userId,
        appId,
        amount: `${total}`,
      }),
    };

    /* check if the request was done */
    ({ Payload } = await lambda.invoke(removeCreditsParams).promise());
    ({ statusCode, body } = JSON.parse(Payload));
    if (statusCode !== 200) throw new Error(`Unable to remove credits with status ${statusCode}`);

    const orderData = {
      _id: uuidv4(),
      userId,
      address,
      productId,
      variantId,
      price,
      qty,
      status: 'pending',
      date: new Date(),
      appIds: [appId],
    };

    /* insert new order in db */
    await client
      .db(DB_NAME)
      .collection(COLL_SHOP_ORDERS)
      .insertOne(orderData);
    return true;
  } finally {
    client.close();
  }
};
