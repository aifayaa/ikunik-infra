import { MongoClient } from 'mongodb';

const doGetUserHistory = async (userId) => {
  let client;

  try {
    client = await MongoClient.connect(process.env.MONGO_URL);
    const history = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .find(
        { userId },
        { sort: { date: -1 },
          limit: 20 },
      ).toArray();
    return history;
  } finally {
    client.close();
  }
};

export const handleGetUserHistory = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const results = await doGetUserHistory(userId);
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
