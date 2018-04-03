import { MongoClient } from 'mongodb';

const doGetArtist = async (artistId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const artist = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne({ _id: artistId });
    return artist;
  } finally {
    client.close();
  }
};

export const handleGetArtist = async (event, context, callback) => {
  try {
    const artistId = event.pathParameters.id;
    const results = await doGetArtist(artistId);
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
