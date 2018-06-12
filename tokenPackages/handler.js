import { MongoClient } from 'mongodb';

const doGetPackages = async (opts) => {
  let client;
  try {
    const selector = {};
    if (opts.type) selector.type = opts.type;
    client = await MongoClient.connect(process.env.MONGO_URL);
    const packages = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .find(selector).toArray();
    return { packages };
  } finally {
    client.close();
  }
};

export const handleGetPackages = async (event, context, callback) => {
  try {
    const results = await doGetPackages(event.queryStringParameters || {});
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
