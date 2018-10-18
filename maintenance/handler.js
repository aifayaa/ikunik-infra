import { MongoClient } from 'mongodb';

const doGetMaintenance = async () => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selector = {
      active: true,
    };

    return await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne(selector);
  } finally {
    client.close();
  }
};

export const handleGetMaintenance = async (event, context, callback) => {
  try {
    const msg = await doGetMaintenance();
    const response = {
      statusCode: 200,
      body: JSON.stringify(msg),
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
