import { MongoClient } from 'mongodb';

const doGetSubscription = async (subId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const sub = await client.db(process.env.DB_NAME).collection('subscriptions')
      .findOne({ _id: subId });
    return sub;
  } finally {
    client.close();
  }
};

export const handleGetSubscription = async (event, context, callback) => {
  try {
    const subId = event.pathParameters.id;
    const results = await doGetSubscription(subId);
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
