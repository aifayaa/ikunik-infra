import { MongoClient } from 'mongodb';

const doGetAudio = async (audioId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const audio = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne({ _id: audioId });
    return audio;
  } finally {
    client.close();
  }
};

export const handleGetAudio = async (event, context, callback) => {
  try {
    const audioId = event.pathParameters.id;
    const results = await doGetAudio(audioId);
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
