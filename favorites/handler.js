import { MongoClient } from 'mongodb';

export const doAddFavorite = async (userId, artistId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  const favoriteData = {
    userId,
    artistId,
    isFavorite: true,
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

export const doUnfavorite = async (userId, artistId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);

  try {
    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .updateOne(
        { userId, artistId },
        {
          $set: { isFavorite: false, date: new Date() },
        }, {
          upsert: true,
        },
      );
    return true;
  } finally {
    client.close();
  }
};

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

export const handleGetFavorite = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { id } = event.pathParameters;

  try {
    const result = await doGetFavorite(userId, id);
    const response = {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials:': true,
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

export const handleAddFavorite = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { id } = event.pathParameters;

  try {
    const result = await doAddFavorite(userId, id);
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

export const handleUnfavorite = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { id } = event.pathParameters;

  try {
    const result = await doUnfavorite(userId, id);
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
