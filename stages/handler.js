import { MongoClient } from 'mongodb';

const doGetStage = async (stageId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const stage = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne({ _id: stageId });
    return stage;
  } finally {
    client.close();
  }
};

export const handleGetStage = async (event, context, callback) => {
  try {
    const stageId = event.pathParameters.id;
    const results = await doGetStage(stageId);
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
