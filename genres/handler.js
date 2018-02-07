import { MongoClient } from 'mongodb';

const doGetGenres = async () => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selector = {};

    const genres = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .find(selector).toArray();
    return { genres };
  } finally {
    client.close();
  }
};

export const handleGetGenres = async (event, context, callback) => {
  try {
    const results = await doGetGenres();
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
      message: e.message,
    };
    callback(null, response);
  }
};
