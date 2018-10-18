import { MongoClient } from 'mongodb';

const doGetFestival = async (festivalId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const festival = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne({ _id: festivalId });
    return festival;
  } finally {
    client.close();
  }
};

export const handleGetFestival = async (event, context, callback) => {
  try {
    const festivalId = event.pathParameters.id;
    const results = await doGetFestival(festivalId);
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
