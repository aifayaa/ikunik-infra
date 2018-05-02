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
