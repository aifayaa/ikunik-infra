import { MongoClient } from 'mongodb';

const doGetPayouts = async () => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selector = {
      state: { $in: ['processing', 'pending'] },
    };

    const payouts = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .find(selector).toArray();
    return { payouts };
  } finally {
    client.close();
  }
};

export const handleGetPayouts = async (event, context, callback) => {
  try {
    const results = await doGetPayouts();
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
      body: JSON.stringify(e.message),
    };
    callback(null, response);
  }
};
