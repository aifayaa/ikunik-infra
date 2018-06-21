import { MongoClient } from 'mongodb';
import findIndex from 'lodash/findIndex';
import validator from 'validator';
import Lambda from 'aws-sdk/clients/lambda';
import request from 'request';
import uuidv1 from 'uuid';

const lambda = new Lambda({
  region: process.env.REGION,
});

const doGetShopItems = async () => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL);
    const items = await client.db(process.env.DB_NAME).collection('shopItems')
      .find({ status: 'active' }).toArray();
    return { items };
  } finally {
    client.close();
  }
};

const doGetShopItem = async (itemId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL);
    return await client.db(process.env.DB_NAME).collection('shopItems')
      .findOne({ _id: itemId });
  } finally {
    client.close();
  }
};

const doShopOrder = async (itemId, variantId, qte, adr, userId) => {
  if (!validator.isInt(qte, { min: 0, allow_leading_zeroes: false, max: 100 })) {
    throw new Error('Wrong quantity');
  }
  if (!adr.name || !adr.address1 || !adr.city || !adr.country_code || !adr.zip) {
    throw new Error('address malformed');
  }
  // let client;
  try {
    const item = await doGetShopItem(itemId);
    if (!item) throw new Error('Shop item not found');
    const { price, sizes } = item;
    if (findIndex(sizes, { variantId }) === -1) throw new Error('Shop variant not find');

    const params = {
      FunctionName: `credits-${process.env.STAGE}-getCredits`,
      Payload: JSON.stringify({ requestContext: { authorizer: { principalId: userId } } }),
    };
    const { Payload } = await lambda.invoke(params).promise();
    const { statusCode, body } = JSON.parse(Payload);
    if (statusCode !== 200) throw new Error(`get credits failed: ${statusCode}`);
    const { credits } = JSON.parse(body);
    if (!credits) throw new Error('unable to get credits from service response');
    if (credits < price) throw new Error('insufficient credits on user account');
    const order = {
      recipient: adr,
      items: [{
        variant_id: variantId,
        quantity: qte,
      }],
    };

    const httpOptions = {
      method: 'POST',
      url: process.env.PRINTFUL_URL,
      headers: {
        Authorization: `Basic ${process.env.PRINTFUL_KEY}`,
      },
      json: true,
      body: order,
    };
    const httpReq = new Promise((resolve, reject) => {
      request(httpOptions, (err, res, httpBody) => {
        const resStatusCode = res.statusCode;
        const { code, result } = httpBody;
        if (err) {
          reject(err);
          return;
        }
        if (resStatusCode !== 200 || code !== 200) {
          reject(new Error(`Bad response code: ${resStatusCode}`));
          return;
        }
        resolve(result);
      });
    });

    const prinfulOrder = await httpReq;
    return prinfulOrder;
  } finally {
    // client.close();
  }
};
export const doPostShopPreOrder = async (userID, productID, data) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  const orderData = {
    userID,
    productID,
    ...data,
    date: new Date(),
  };

  try {
    /* check if the product exist */
    const item = await doGetShopItem(productID);
    if (!item) throw new Error('[ERROR]: Product not found');

    /* check if selected variant exist */
    const { sizes } = item;
    const { variantId } = data;
    if (findIndex(sizes, { variantId: parseInt(variantId, 10) }) === -1) {
      throw new Error('[ERROR]: Product variant not found');
    }

    /* check if 1 <= qty <=10 */
    if (!validator.isInt(data.itmQty, { min: 1, allow_leading_zeroes: false, max: 10 })) {
      throw new Error('[Incorrect quantity selected]: Must be between 1 and 10');
    }

    /* insert new order in db */
    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .insertOne({ _id: uuidv1(), ...orderData });
    return true;
  } finally {
    client.close();
  }
};

export const handlePostShopPreOrder = async (event, context, callback) => {
  const userID = event.requestContext.authorizer.principalId;
  const { productID } = event.pathParameters;
  let result;

  try {
    const data = JSON.parse(event.body);
    if (!data.itmQty || !data.total || !data.address || !data.variantId) {
      throw new Error('Missing parameters for the request');
    }
    result = await doPostShopPreOrder(userID, productID, data);
    const response = {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};

export const handleGetShopItem = async (event, context, callback) => {
  try {
    const itemId = event.pathParameters.id;
    const result = await doGetShopItem(itemId);
    const response = {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};

export const handleGetShopItems = async (event, context, callback) => {
  try {
    const results = await doGetShopItems();
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};

export const handlePostShopOrder = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { itemId, variantId, qte, adr } = JSON.parse(event.body);
    if (!itemId || !variantId || !qte || !adr) {
      throw new Error('mal formed request');
    }
    const results = await doShopOrder(itemId, variantId, qte, adr, userId);
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};
