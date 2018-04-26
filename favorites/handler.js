import { MongoClient } from 'mongodb';

export const doGetFavorite = async (userId, artistId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);

  try {
    const data = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne({ userId, artistId });
    return data;
  } finally {
    client.close();
  }
};

export const doToggleFavorite = async (userId, artistId, isFavorite) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  const favoriteData = {
    userId,
    artistId,
    isFavorite,
    date: new Date(),
  };

  try {
    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .update({ userId, artistId }, favoriteData, { upsert: true });
    return true;
  } finally {
    client.close();
  }
};

export const handleFavorite = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { id } = event.pathParameters;
  let result;

  try {
    switch (event.httpMethod) {
      case 'GET':
        result = await doGetFavorite(userId, id);
        break;
      case 'POST':
        result = await doToggleFavorite(userId, id, true);
        break;
      case 'DELETE':
        result = await doToggleFavorite(userId, id, false);
        break;
      default:
        result = await doGetFavorite(userId, id);
    }
    const response = {
      statusCode: 200,
      body: JSON.stringify(result),
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
