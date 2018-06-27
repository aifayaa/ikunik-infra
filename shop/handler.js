import { MongoClient } from 'mongodb';
import findIndex from 'lodash/findIndex';
import validator from 'validator';
import uuidv4 from 'uuid';

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

const doPostShopOrder = async (userID, productId, qty, address, variantId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);

  try {
    /* check if 1 <= qty <=10 */
    if (!validator.isInt(qty, { min: 1, allow_leading_zeroes: false, max: 10 })) {
      throw new Error('Wrong quantity');
    }

    /* check if the product exist */
    const item = await doGetShopItem(productId);
    if (!item) throw new Error('Product not found');

    /* check if selected variant exist */
    const { sizes, price } = item;
    if (findIndex(sizes, { variantId: parseInt(variantId, 10) }) === -1) {
      throw new Error('Product variant not found');
    }

    const orderData = {
      userID,
      address,
      productId,
      variantId,
      price,
      qty,
      status: 'pending',
      date: new Date(),
    };

    /* insert new order in db */
    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .insertOne({ _id: uuidv4(), ...orderData });
    return true;
  } finally {
    client.close();
  }
};

export const handlePostShopOrder = async (event, context, callback) => {
  const userID = event.requestContext.authorizer.principalId;
  const productId = event.pathParameters.id;
  let result;

  try {
    const data = JSON.parse(event.body);
    const {
      qty,
      address,
      variantId,
    } = data;

    if (!data || !qty || !address || !variantId) {
      throw new Error('Mal formed request');
    }
    result = await doPostShopOrder(userID, productId, qty, address, variantId);
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
