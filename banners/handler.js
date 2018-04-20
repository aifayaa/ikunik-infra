import { MongoClient } from 'mongodb';

const doGetBanners = async () => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selector = {};

    const banners = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .find(selector, { sort: [['date', -1]] }).toArray();
    return { banners };
  } finally {
    client.close();
  }
};

export const handleGetBanners = async (event, context, callback) => {
  try {
    const results = await doGetBanners();
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
