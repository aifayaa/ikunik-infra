import { MongoClient } from 'mongodb';

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
  let client;
  try {
    const { price, sizes } = doGetShopItem(itemId);
    if (!price) throw new Error('Shop item not found');
    // Check in this item, if variantID exists

    // TODO get credits and compare to price
    const params = {
      FunctionName: `credits-${process.env.STAGE}-getCredits`,
    };
    const res = await lambda.invoke(params).promise();
    console.log('++++++++', res);

    // Open order
    // get back order id and put it in shopOrders collection
    // consume crédits
    // send email to say order is done
    // webhook to listen to order detail event state
    /*const { Payload } = await lambda.invoke(params).promise();
    const res = JSON.parse(Payload);
    if (res.statusCode !== 200) {
      throw new Error(`addCredits handler failed: ${res.body}`);
    }*/

    /*client = await MongoClient.connect(process.env.MONGO_URL);
    return await client.db(process.env.DB_NAME).collection('shopItems')
      .findOne({ _id: itemId });*/
    return true;
  } finally {
    client.close();
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
    if (!itemId, !variantId || !qte || !adr) {
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
