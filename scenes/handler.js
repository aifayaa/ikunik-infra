import { MongoClient } from 'mongodb';

const doGetScene = async (sceneId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const scene = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne({ _id: sceneId });
    return scene;
  } finally {
    client.close();
  }
};

export const handleGetScene = async (event, context, callback) => {
  try {
    const sceneId = event.pathParameters.id;
    const results = await doGetScene(sceneId);
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
